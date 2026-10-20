import { spawn } from "node:child_process";
import { logger } from "@/lib/observability/logger";
import { MediaFailure } from "./failure";

const STDERR_TAIL_BYTES = 4_096;

export const transcodeTimeoutMs = (durationSeconds: number) =>
  Math.max(10 * 60_000, 6 * durationSeconds * 1_000);

const commandFor = (ffmpegPath: string, args: string[]) =>
  process.env.MEDIA_NICE === "0"
    ? { command: ffmpegPath, argv: args }
    : { command: "nice", argv: ["-n", "10", ffmpegPath, ...args] };

export function progressFraction(
  line: string,
  durationSeconds: number,
): number | null {
  const [key, value] = line.split("=");
  if (key !== "out_time_us" && key !== "out_time_ms") return null;
  const micros = Number(value);
  if (!Number.isFinite(micros) || durationSeconds <= 0) return null;
  return Math.min(0.99, Math.max(0, micros / 1_000_000 / durationSeconds));
}

export function runFfmpeg(
  args: string[],
  {
    ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg",
    durationSeconds,
    timeoutMs = transcodeTimeoutMs(durationSeconds),
    onProgress,
    signal,
  }: {
    ffmpegPath?: string;
    durationSeconds: number;
    timeoutMs?: number;
    onProgress?: (fraction: number) => void | Promise<void>;
    signal?: AbortSignal;
  },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const { command, argv } = commandFor(ffmpegPath, args);
    const child = spawn(command, argv, { stdio: ["ignore", "pipe", "pipe"] });
    let stderrTail = "";
    let buffered = "";
    let lastPercent = -1;
    let killedFor: "timeout" | "abort" | null = null;

    const kill = (reason: "timeout" | "abort") => {
      killedFor = reason;
      child.kill("SIGKILL");
    };
    const timer = setTimeout(() => kill("timeout"), timeoutMs);
    const onAbort = () => kill("abort");
    signal?.addEventListener("abort", onAbort, { once: true });

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      buffered += chunk;
      const lines = buffered.split("\n");
      buffered = lines.pop() ?? "";
      for (const line of lines) {
        const fraction = progressFraction(line.trim(), durationSeconds);
        if (fraction === null || !onProgress) continue;
        const percent = Math.floor(fraction * 100);
        if (percent <= lastPercent) continue;
        lastPercent = percent;
        void Promise.resolve(onProgress(percent / 100)).catch(() => {});
      }
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderrTail = (stderrTail + chunk).slice(-STDERR_TAIL_BYTES);
    });

    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    };

    child.on("error", () => {
      finish();
      reject(new MediaFailure("transcodeFailed"));
    });
    child.on("close", (code) => {
      finish();
      if (killedFor === "timeout") return reject(new MediaFailure("timeout"));
      if (killedFor === "abort")
        return reject(new MediaFailure("transcodeFailed"));
      if (code !== 0) {
        logger.warn(
          {
            event: "media.ffmpegFailed",
            exit_code: code,
            stderr_tail: stderrTail,
          },
          "ffmpeg exited with an error",
        );
        return reject(new MediaFailure("transcodeFailed"));
      }
      resolve();
    });
  });
}
