import { spawn } from "node:child_process";
import { MediaFailure } from "./failure";

export type ProbeInfo = {
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  hasAudio: boolean;
  formatName: string;
};

export type ProbeLimits = { maxDurationSeconds: number };

const ALLOWED_FORMATS = new Set([
  "mov",
  "mp4",
  "m4a",
  "3gp",
  "3g2",
  "mj2",
  "matroska",
  "webm",
]);

const MAX_LONG_EDGE = 3840;
const MAX_SHORT_EDGE = 2160;
const MAX_FPS = 61;

type RawStream = {
  codec_type?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  r_frame_rate?: string;
  duration?: string;
  disposition?: { attached_pic?: number };
  tags?: { rotate?: string };
  side_data_list?: { rotation?: number | string }[];
};

type RawProbe = {
  format?: { format_name?: string; duration?: string };
  streams?: RawStream[];
};

const rate = (value: string | undefined) => {
  if (!value) return 0;
  const [num, den] = value.split("/").map(Number);
  if (!Number.isFinite(num)) return 0;
  if (den === undefined) return num;
  return den > 0 && Number.isFinite(den) ? num / den : 0;
};

const rotationOf = (stream: RawStream) => {
  const side = stream.side_data_list?.find(
    (entry) => entry.rotation !== undefined,
  );
  const raw = side?.rotation ?? stream.tags?.rotate ?? 0;
  return Math.abs(Number(raw)) % 180 === 90;
};

export function parseProbe(json: unknown, limits: ProbeLimits): ProbeInfo {
  const raw = (json ?? {}) as RawProbe;
  const formatName = raw.format?.format_name ?? "";
  const tokens = formatName.split(",").map((token) => token.trim());
  if (!tokens.some((token) => ALLOWED_FORMATS.has(token)))
    throw new MediaFailure("unsupportedFormat");

  const streams = raw.streams ?? [];
  const video = streams.find(
    (stream) =>
      stream.codec_type === "video" && stream.disposition?.attached_pic !== 1,
  );
  if (!video || !video.width || !video.height)
    throw new MediaFailure("noVideoStream");

  const durationSeconds = Number(raw.format?.duration ?? video.duration ?? 0);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0)
    throw new MediaFailure("unsupportedFormat");
  if (durationSeconds > limits.maxDurationSeconds)
    throw new MediaFailure("tooLong");

  const rotated = rotationOf(video);
  const width = rotated ? video.height : video.width;
  const height = rotated ? video.width : video.height;
  if (
    Math.max(width, height) > MAX_LONG_EDGE ||
    Math.min(width, height) > MAX_SHORT_EDGE
  )
    throw new MediaFailure("tooLarge");

  const fps = rate(video.avg_frame_rate) || rate(video.r_frame_rate) || 30;
  if (fps > MAX_FPS) throw new MediaFailure("tooLarge");

  return {
    durationSeconds,
    width,
    height,
    fps,
    hasAudio: streams.some((stream) => stream.codec_type === "audio"),
    formatName,
  };
}

export function probe(
  path: string,
  limits: ProbeLimits,
  {
    ffprobePath = process.env.FFPROBE_PATH || "ffprobe",
    timeoutMs = 30_000,
  }: { ffprobePath?: string; timeoutMs?: number } = {},
): Promise<ProbeInfo> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      ffprobePath,
      [
        "-v",
        "error",
        "-protocol_whitelist",
        "file,pipe",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        path,
      ],
      { stdio: ["ignore", "pipe", "ignore"] },
    );
    const chunks: Buffer[] = [];
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.on("error", () => {
      clearTimeout(timer);
      reject(new MediaFailure("unsupportedFormat"));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) return reject(new MediaFailure("timeout"));
      if (code !== 0) return reject(new MediaFailure("unsupportedFormat"));
      try {
        resolve(
          parseProbe(
            JSON.parse(Buffer.concat(chunks).toString("utf8")),
            limits,
          ),
        );
      } catch (error) {
        reject(
          error instanceof MediaFailure
            ? error
            : new MediaFailure("unsupportedFormat"),
        );
      }
    });
  });
}
