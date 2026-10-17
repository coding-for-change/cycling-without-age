import {
  abortVideoUploadAction,
  completeVideoUploadAction,
  signVideoPartsAction,
  startVideoUploadAction,
  uploadedVideoPartsAction,
  type TrainingError,
} from "../actions";
import { PART_SIZE, VIDEO_MIMES, type ContentLanguage } from "../schemas";

export type UploadErrorCode = TrainingError | "network" | "invalid";

export type UploadPhase =
  | "starting"
  | "uploading"
  | "paused"
  | "completing"
  | "processing"
  | "failed"
  | "cancelled";

export type UploadState = {
  phase: UploadPhase;
  videoId: string | null;
  loaded: number;
  total: number;
  speed: number;
  eta: number | null;
  error: UploadErrorCode | null;
};

export type UploadRequest = {
  file: File;
  title: string;
  language: ContentLanguage;
  scope?: string;
  resumeVideoId?: string;
  onState: (state: UploadState) => void;
};

const PARALLEL = 4;
const SIGN_BATCH = 8;
const URL_MAX_AGE_MS = 50 * 60_000;
const MAX_TRIES = 5;
const SPEED_WINDOW_MS = 3_000;
const SAMPLE_EVERY_MS = 250;
const EMIT_EVERY_MS = 100;

const EXTENSION_MIMES: Record<string, (typeof VIDEO_MIMES)[number]> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  webm: "video/webm",
  mkv: "video/x-matroska",
};

export const VIDEO_ACCEPT = [
  ...VIDEO_MIMES,
  ...Object.keys(EXTENSION_MIMES).map((extension) => `.${extension}`),
].join(",");

export function videoMimeOf(file: File) {
  if ((VIDEO_MIMES as readonly string[]).includes(file.type))
    return file.type as (typeof VIDEO_MIMES)[number];
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (file.type && file.type !== "application/octet-stream") return null;
  return EXTENSION_MIMES[extension] ?? null;
}

export type VideoCheck =
  | { ok: true; durationSeconds: number | null }
  | { ok: false; reason: "type" | "size" | "duration" | "empty" };

const PROBE_TIMEOUT_MS = 8_000;

function probeDuration(file: File) {
  return new Promise<number | null>((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    let settled = false;
    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), PROBE_TIMEOUT_MS);
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () =>
      finish(Number.isFinite(video.duration) ? video.duration : null);
    video.onerror = () => finish(null);
    video.src = url;
  });
}

export async function validateVideoFile(
  file: File,
  limits: { maxBytes: number; maxDurationSeconds: number },
): Promise<VideoCheck> {
  if (!videoMimeOf(file)) return { ok: false, reason: "type" };
  if (file.size <= 0) return { ok: false, reason: "empty" };
  if (file.size > limits.maxBytes) return { ok: false, reason: "size" };
  const durationSeconds = await probeDuration(file);
  if (durationSeconds !== null && durationSeconds > limits.maxDurationSeconds)
    return { ok: false, reason: "duration" };
  return { ok: true, durationSeconds };
}

class PartFailed extends Error {
  constructor(readonly status: number) {
    super(`part upload failed (${status})`);
  }
}

class Stopped extends Error {}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const backoff = (attempt: number) =>
  Math.min(30_000, 1_000 * 2 ** attempt) * (0.5 + Math.random());

export class VideoUpload {
  private state: UploadState;
  private partCount = 0;
  private readonly done = new Map<number, string>();
  private readonly inFlight = new Map<number, XMLHttpRequest>();
  private readonly partLoaded = new Map<number, number>();
  private readonly urls = new Map<number, { url: string; at: number }>();
  private pending: number[] = [];
  private stopped = false;
  private run = 0;
  private lastSample = { at: 0, loaded: 0 };
  private lastEmit = 0;

  constructor(private readonly request: UploadRequest) {
    this.state = {
      phase: "starting",
      videoId: request.resumeVideoId ?? null,
      loaded: 0,
      total: request.file.size,
      speed: 0,
      eta: null,
      error: null,
    };
  }

  get snapshot() {
    return this.state;
  }

  async start() {
    const mime = videoMimeOf(this.request.file);
    if (!mime) return this.fail("invalid");

    if (this.state.videoId) {
      const result = await uploadedVideoPartsAction(this.state.videoId);
      if (!result.ok) return this.fail(result.error);
      this.partCount = Math.ceil(this.request.file.size / PART_SIZE);
      for (const part of result.parts)
        if (part.partNumber <= this.partCount)
          this.done.set(part.partNumber, part.etag);
    } else {
      const result = await startVideoUploadAction({
        scope: this.request.scope,
        language: this.request.language,
        title: this.request.title,
        mime,
        size: this.request.file.size,
      });
      if (!result.ok) return this.fail(result.error);
      this.partCount = result.partCount;
      this.update({ videoId: result.videoId });
    }
    if (this.stopped) {
      if (this.state.videoId) await abortVideoUploadAction(this.state.videoId);
      return;
    }
    this.pump();
  }

  pause() {
    if (this.state.phase !== "uploading") return;
    this.stopInFlight();
    this.update({ phase: "paused", speed: 0, eta: null }, true);
  }

  resume() {
    if (this.state.phase !== "paused" && this.state.phase !== "failed") return;
    if (!this.state.videoId) return;
    this.stopped = false;
    this.update({ error: null }, true);
    this.pump();
  }

  async cancel() {
    this.stopped = true;
    this.stopInFlight();
    const started = this.state.phase !== "starting";
    this.update({ phase: "cancelled", speed: 0, eta: null }, true);
    if (started && this.state.videoId)
      await abortVideoUploadAction(this.state.videoId);
  }

  private stopInFlight() {
    this.run += 1;
    for (const xhr of this.inFlight.values()) xhr.abort();
    this.inFlight.clear();
    this.partLoaded.clear();
    this.refreshLoaded();
  }

  private pump() {
    const run = ++this.run;
    this.pending = Array.from(
      { length: this.partCount },
      (_, i) => i + 1,
    ).filter((part) => !this.done.has(part));
    this.lastSample = { at: performance.now(), loaded: this.loadedBytes() };
    this.update({ phase: "uploading", error: null }, true);
    void Promise.all(
      Array.from({ length: PARALLEL }, () => this.lane(run)),
    ).then(
      () => this.finish(run),
      (error: unknown) => {
        if (error instanceof Stopped || run !== this.run) return;
        this.stopInFlight();
        this.fail("network");
      },
    );
  }

  private async lane(run: number) {
    for (;;) {
      if (run !== this.run) throw new Stopped();
      const part = this.pending.shift();
      if (part === undefined) return;
      await this.uploadPart(part, run);
    }
  }

  private async uploadPart(part: number, run: number) {
    for (let attempt = 0; ; attempt++) {
      if (run !== this.run) throw new Stopped();
      try {
        const url = await this.urlFor(part);
        const etag = await this.put(part, url);
        this.done.set(part, etag);
        this.inFlight.delete(part);
        this.partLoaded.delete(part);
        this.refreshLoaded();
        return;
      } catch (error) {
        if (error instanceof Stopped || run !== this.run) throw new Stopped();
        this.inFlight.delete(part);
        this.partLoaded.delete(part);
        this.refreshLoaded();
        if (error instanceof PartFailed && error.status === 403)
          this.urls.delete(part);
        if (attempt + 1 >= MAX_TRIES) throw error;
        await wait(backoff(attempt));
      }
    }
  }

  private async urlFor(part: number) {
    const cached = this.urls.get(part);
    if (cached && Date.now() - cached.at < URL_MAX_AGE_MS) return cached.url;
    const batch = [
      part,
      ...this.pending
        .filter((next) => {
          const url = this.urls.get(next);
          return !url || Date.now() - url.at >= URL_MAX_AGE_MS;
        })
        .slice(0, SIGN_BATCH - 1),
    ];
    const result = await signVideoPartsAction({
      videoId: this.state.videoId,
      partNumbers: batch,
    });
    if (!result.ok) throw new PartFailed(0);
    const at = Date.now();
    for (const signed of result.parts)
      this.urls.set(signed.partNumber, { url: signed.url, at });
    const url = this.urls.get(part)?.url;
    if (!url) throw new PartFailed(0);
    return url;
  }

  private put(part: number, url: string) {
    const start = (part - 1) * PART_SIZE;
    const body = this.request.file.slice(
      start,
      Math.min(start + PART_SIZE, this.request.file.size),
    );
    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      this.inFlight.set(part, xhr);
      xhr.open("PUT", url);
      xhr.upload.onprogress = (event) => {
        this.partLoaded.set(part, event.loaded);
        this.refreshLoaded();
      };
      xhr.onload = () => {
        const etag = xhr.getResponseHeader("ETag");
        if (xhr.status >= 200 && xhr.status < 300 && etag) resolve(etag);
        else reject(new PartFailed(xhr.status));
      };
      xhr.onerror = () => reject(new PartFailed(0));
      xhr.ontimeout = () => reject(new PartFailed(0));
      xhr.onabort = () => reject(new Stopped());
      xhr.send(body);
    });
  }

  private async finish(run: number) {
    if (run !== this.run || this.stopped) return;
    this.update({ phase: "completing", speed: 0, eta: 0 }, true);
    const result = await completeVideoUploadAction({
      videoId: this.state.videoId,
      parts: [...this.done].map(([partNumber, etag]) => ({
        partNumber,
        etag,
      })),
    });
    if (!result.ok) return this.fail(result.error);
    this.update(
      { phase: "processing", loaded: this.state.total, speed: 0, eta: 0 },
      true,
    );
  }

  private loadedBytes() {
    let loaded = 0;
    for (const part of this.done.keys())
      loaded += Math.min(
        PART_SIZE,
        this.request.file.size - (part - 1) * PART_SIZE,
      );
    for (const bytes of this.partLoaded.values()) loaded += bytes;
    return Math.min(loaded, this.request.file.size);
  }

  private refreshLoaded() {
    const loaded = this.loadedBytes();
    const now = performance.now();
    const elapsed = now - this.lastSample.at;
    let { speed } = this.state;
    if (elapsed >= SAMPLE_EVERY_MS) {
      const instant =
        Math.max(0, loaded - this.lastSample.loaded) / (elapsed / 1_000);
      const alpha = 1 - Math.exp(-elapsed / SPEED_WINDOW_MS);
      speed = speed === 0 ? instant : speed + alpha * (instant - speed);
      this.lastSample = { at: now, loaded };
    }
    const eta =
      speed > 0 ? Math.max(0, (this.state.total - loaded) / speed) : null;
    this.update({ loaded, speed, eta });
  }

  private fail(error: UploadErrorCode) {
    this.update({ phase: "failed", error, speed: 0, eta: null }, true);
  }

  private update(patch: Partial<UploadState>, force = false) {
    this.state = { ...this.state, ...patch };
    const now = performance.now();
    if (!force && now - this.lastEmit < EMIT_EVERY_MS) return;
    this.lastEmit = now;
    this.request.onState(this.state);
  }
}

export function startVideoUpload(request: UploadRequest) {
  const upload = new VideoUpload(request);
  void upload.start();
  return upload;
}
