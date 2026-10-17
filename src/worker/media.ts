import { open, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { createReadStream } from "node:fs";
import type { Job } from "bullmq";
import {
  mediaJob,
  posterJob,
  purgeJob,
  training,
  type RenditionRow,
  type TranscodeContext,
} from "@/features/training";
import {
  MediaFailure,
  buildHlsArgs,
  buildPosterArgs,
  looksLikeVideo,
  posterSecond,
  probe,
  renditionName,
  renditionsFor,
  runFfmpeg,
  withScratch,
  type ProbeInfo,
} from "@/lib/media";
import { serializeError } from "@/lib/observability/errors";
import { childLogger } from "@/lib/observability/logger";
import { toPosterWebp } from "@/lib/storage/image";
import {
  ObjectTooLarge,
  downloadToFile,
  putMediaObject,
  readMediaObject,
} from "@/lib/storage/s3";

const log = childLogger({ queue: "media" });

const PROGRESS_EVERY_MS = 2_000;
const UPLOAD_CONCURRENCY = 8;
const POSTER_WIDTHS = { large: 1280, small: 480 } as const;
const POSTER_TIMEOUT_MS = 60_000;

const threads = () => {
  const value = Number(process.env.FFMPEG_THREADS);
  return Number.isInteger(value) && value > 0 ? value : 2;
};

const MIME_BY_EXTENSION: Record<string, string> = {
  m3u8: "application/vnd.apple.mpegurl",
  m4s: "video/iso.segment",
  mp4: "video/mp4",
  webp: "image/webp",
};

const mimeOf = (path: string) =>
  MIME_BY_EXTENSION[path.split(".").pop() ?? ""] ?? "application/octet-stream";

async function filesUnder(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

async function uploadTree(dir: string, prefix: (path: string) => string) {
  const files = await filesUnder(dir);
  let next = 0;
  const lane = async () => {
    while (next < files.length) {
      const file = files[next++];
      const { size } = await stat(file);
      await putMediaObject(
        prefix(relative(dir, file)),
        createReadStream(file),
        mimeOf(file),
        size,
      );
    }
  };
  await Promise.all(Array.from({ length: UPLOAD_CONCURRENCY }, lane));
}

async function readHead(path: string) {
  const handle = await open(path, "r");
  try {
    const head = Buffer.alloc(64);
    const { bytesRead } = await handle.read(head, 0, head.length, 0);
    return head.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

async function writePosters(
  frame: Buffer,
  context: { mediaKey: string; revision: number },
  seconds: number,
) {
  const keys = training.posterKeys(context.mediaKey, context.revision, seconds);
  const [large, small] = await Promise.all([
    toPosterWebp(frame, POSTER_WIDTHS.large),
    toPosterWebp(frame, POSTER_WIDTHS.small),
  ]);
  await Promise.all([
    putMediaObject(keys.large, large, "image/webp", large.length),
    putMediaObject(keys.small, small, "image/webp", small.length),
  ]);
}

async function grabFrame(input: string, seconds: number, dir: string) {
  const output = join(dir, `frame-${Date.now()}.png`);
  await runFfmpeg(buildPosterArgs({ input, seconds, output }), {
    durationSeconds: 1,
    timeoutMs: POSTER_TIMEOUT_MS,
  });
  return readFile(output);
}

const renditionRows = (source: ProbeInfo): RenditionRow[] =>
  renditionsFor(source).map((rendition) => ({
    name: renditionName(rendition),
    width: rendition.width,
    height: rendition.height,
    videoKbps: rendition.videoKbps,
  }));

function throttledProgress(context: TranscodeContext) {
  let last = 0;
  return async (fraction: number) => {
    const now = Date.now();
    if (now - last < PROGRESS_EVERY_MS) return;
    last = now;
    await training.setProgress(
      context.videoId,
      context.revision,
      fraction * 95,
    );
  };
}

async function transcodeIn(dir: string, context: TranscodeContext) {
  const source = join(dir, "source");
  try {
    await downloadToFile(context.sourceKey, source, context.maxBytes);
  } catch (error) {
    if (error instanceof ObjectTooLarge) throw new MediaFailure("tooLarge");
    if ((error as { name?: string }).name === "NoSuchKey")
      throw new MediaFailure("sourceMissing");
    throw error;
  }

  if (!looksLikeVideo(await readHead(source)))
    throw new MediaFailure("unsupportedFormat");

  const info = await probe(source, {
    maxDurationSeconds: context.maxDurationSeconds,
  });

  const outDir = join(dir, "out");
  await runFfmpeg(
    buildHlsArgs({ input: source, outDir, source: info, threads: threads() }),
    {
      durationSeconds: info.durationSeconds,
      onProgress: throttledProgress(context),
    },
  );

  const seconds = posterSecond(info.durationSeconds);
  await writePosters(await grabFrame(source, seconds, dir), context, seconds);
  await uploadTree(outDir, (path) =>
    training.mediaKeyOf(context.mediaKey, context.revision, path),
  );

  return {
    durationSeconds: info.durationSeconds,
    width: info.width,
    height: info.height,
    renditions: renditionRows(info),
    posterSeconds: seconds,
  };
}

async function fail(context: TranscodeContext, error: unknown) {
  const code = error instanceof MediaFailure ? error.code : "transcodeFailed";
  await training.markFailed(context.videoId, context.revision, code);
  await training
    .purgeRevision(context.mediaKey, context.revision)
    .catch(() => undefined);
  log.warn(
    {
      event: "trainingVideo.failed",
      video_id: context.videoId,
      revision: context.revision,
      code,
    },
    "training video failed",
  );
}

async function transcode(job: Job) {
  const { videoId, revision } = mediaJob.parse(job.data);
  const context = await training.markProcessing(videoId, revision);
  if (!context) return "stale";

  try {
    const facts = await withScratch((dir) => transcodeIn(dir, context));
    await training.markReady(videoId, revision, facts);
    log.info(
      { event: "trainingVideo.ready", video_id: videoId, revision },
      "training video ready",
    );
    return "ready";
  } catch (error) {
    const lastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
    if (error instanceof MediaFailure || lastAttempt) {
      await fail(context, error);
      if (!(error instanceof MediaFailure))
        log.error(
          { video_id: videoId, err: serializeError(error) },
          "transcode crashed",
        );
      return "failed";
    }
    throw error;
  }
}

type Segment = { uri: string; start: number; duration: number };

function segmentsOf(playlist: string) {
  const lines = playlist.split(/\r?\n/);
  const init = /#EXT-X-MAP:URI="([^"]+)"/.exec(playlist)?.[1] ?? null;
  const segments: Segment[] = [];
  let start = 0;
  let pending: number | null = null;
  for (const line of lines) {
    if (line.startsWith("#EXTINF:")) pending = parseFloat(line.slice(8));
    else if (pending !== null && line && !line.startsWith("#")) {
      segments.push({ uri: line.trim(), start, duration: pending });
      start += pending;
      pending = null;
    }
  }
  return { init, segments };
}

const safeName = (uri: string) => /^[\w.-]+$/.test(uri);

async function poster(job: Job) {
  const { videoId, revision, seconds } = posterJob.parse(job.data);
  const context = await training.posterContext(videoId, revision);
  if (!context) return "stale";
  const top = context.renditions.at(-1);
  if (!top) return "stale";

  const playlistKey = training.mediaKeyOf(
    context.mediaKey,
    revision,
    `${top.name}/index.m3u8`,
  );
  const { init, segments } = segmentsOf(
    (await readMediaObject(playlistKey)).toString("utf8"),
  );
  const segment =
    segments.find((s) => seconds < s.start + s.duration) ?? segments.at(-1);
  if (!init || !segment || !safeName(init) || !safeName(segment.uri))
    return "stale";

  await withScratch(async (dir) => {
    const read = (name: string) =>
      readMediaObject(
        training.mediaKeyOf(context.mediaKey, revision, `${top.name}/${name}`),
      );
    const [initBytes, segmentBytes] = await Promise.all([
      read(init),
      read(segment.uri),
    ]);
    const clip = join(dir, "clip.mp4");
    await writeFile(clip, Buffer.concat([initBytes, segmentBytes]));
    const offset = Math.max(
      0,
      Math.min(seconds - segment.start, segment.duration - 0.05),
    );
    await writePosters(await grabFrame(clip, offset, dir), context, seconds);
  });

  await training.setPoster(videoId, revision, seconds);
  return "poster";
}

async function purge(job: Job) {
  const data = purgeJob.parse(job.data);
  const removed = await training.purgeVideoFiles(data);
  log.info(
    { event: "trainingVideo.purged", video_id: data.videoId, removed },
    "training video purged",
  );
  return "purged";
}

const MEDIA_JOBS: Record<string, (job: Job) => Promise<string>> = {
  transcode,
  poster,
  purge,
};

export async function runMediaJob(job: Job) {
  const run = MEDIA_JOBS[job.name];
  if (!run) throw new Error(`[media] unknown job ${job.name}`);
  return run(job);
}
