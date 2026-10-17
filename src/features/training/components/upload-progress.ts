import { wordsLocale } from "@/lib/format";
import type { TrayRow } from "./upload-store";

export type UploadProgress =
  | { kind: "uploading"; fraction: number }
  | { kind: "preparing"; fraction: number }
  | { kind: "queued" }
  | { kind: "ready" }
  | { kind: "failed" }
  | { kind: "gone" };

export function progressOf(row: TrayRow): UploadProgress {
  const { state, server } = row;
  if (state.phase === "cancelled") return { kind: "gone" };
  if (
    row.settled === "failed" ||
    server?.status === "failed" ||
    state.phase === "failed" ||
    row.interrupted
  )
    return { kind: "failed" };
  if (row.settled === "ready" || server?.status === "ready")
    return { kind: "ready" };
  if (state.phase === "processing")
    return server?.status === "processing"
      ? { kind: "preparing", fraction: server.progress / 100 }
      : { kind: "queued" };
  return {
    kind: "uploading",
    fraction: state.total > 0 ? state.loaded / state.total : 0,
  };
}

const percentFormats = new Map<string, Intl.NumberFormat>();

export function percentLabel(fraction: number, language: string) {
  const locale = wordsLocale(language);
  let format = percentFormats.get(locale);
  if (!format) {
    format = new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits: 0,
    });
    percentFormats.set(locale, format);
  }
  return format.format(Math.min(1, Math.max(0, fraction)));
}
