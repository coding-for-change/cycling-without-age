import { abortVideoUploadAction, type VideoStatusView } from "../actions";
import {
  startVideoUpload,
  type UploadState,
  type VideoUpload,
} from "./video-upload";
import type { ContentLanguage } from "../schemas";

export type TrayItem = {
  file: File;
  title: string;
  language: ContentLanguage;
  scope?: string;
  assignTo?: string;
};

export type TrayRow = {
  key: string;
  title: string;
  fileName: string;
  size: number;
  lastModified: number;
  language: ContentLanguage;
  scope?: string;
  assignTo?: string;
  state: UploadState;
  server?: VideoStatusView;
  interrupted: boolean;
  wrongFile: boolean;
  settled: "ready" | "failed" | null;
  retryError: string | null;
};

type Persisted = Pick<
  TrayRow,
  | "key"
  | "title"
  | "fileName"
  | "size"
  | "lastModified"
  | "language"
  | "scope"
  | "assignTo"
> & { videoId: string };

const STORAGE_KEY = "cwa.training.uploads";

let rows: TrayRow[] = [];
const uploads = new Map<string, VideoUpload>();
const items = new Map<string, TrayItem>();
const listeners = new Set<() => void>();
let restored = false;

const emit = () => {
  for (const listener of listeners) listener();
};

const set = (next: TrayRow[]) => {
  rows = next;
  persist();
  emit();
};

const patch = (key: string, change: Partial<TrayRow>) =>
  set(rows.map((row) => (row.key === key ? { ...row, ...change } : row)));

const resumable = (row: TrayRow) =>
  row.state.videoId !== null &&
  (row.interrupted ||
    ["starting", "uploading", "paused"].includes(row.state.phase) ||
    (row.state.phase === "failed" && row.state.error === "network"));

function persist() {
  try {
    const kept: Persisted[] = rows.filter(resumable).map((row) => ({
      key: row.key,
      title: row.title,
      fileName: row.fileName,
      size: row.size,
      lastModified: row.lastModified,
      language: row.language,
      scope: row.scope,
      assignTo: row.assignTo,
      videoId: row.state.videoId!,
    }));
    if (kept.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

function restore() {
  if (restored || typeof window === "undefined") return;
  restored = true;
  let saved: Persisted[] = [];
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {}
  if (!Array.isArray(saved) || saved.length === 0) return;
  rows = [
    ...rows,
    ...saved
      .filter((item) => typeof item?.videoId === "string")
      .map((item): TrayRow => ({
        ...item,
        interrupted: true,
        wrongFile: false,
        settled: null,
        retryError: null,
        state: {
          phase: "paused",
          videoId: item.videoId,
          loaded: 0,
          total: item.size,
          speed: 0,
          eta: null,
          error: null,
        },
      })),
  ];
}

export function subscribe(listener: () => void) {
  restore();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getSnapshot = () => rows;

const EMPTY: TrayRow[] = [];
export const getServerSnapshot = () => EMPTY;

function launch(key: string, item: TrayItem, resumeVideoId?: string) {
  items.set(key, item);
  const upload = startVideoUpload({
    ...item,
    resumeVideoId,
    onState: (state) => patch(key, { state }),
  });
  uploads.set(key, upload);
}

const newKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

export function enqueue(items: TrayItem[]) {
  const added = items.map((item) => ({ key: newKey(), item }));
  set([
    ...added.map(({ key, item }): TrayRow => ({
      key,
      title: item.title,
      fileName: item.file.name,
      size: item.file.size,
      lastModified: item.file.lastModified,
      language: item.language,
      scope: item.scope,
      assignTo: item.assignTo,
      interrupted: false,
      wrongFile: false,
      settled: null,
      retryError: null,
      state: {
        phase: "starting",
        videoId: null,
        loaded: 0,
        total: item.file.size,
        speed: 0,
        eta: null,
        error: null,
      },
    })),
    ...rows,
  ]);
  for (const { key, item } of added) launch(key, item);
  return added.map(({ key }) => key);
}

export const pause = (key: string) => uploads.get(key)?.pause();

export function resume(key: string) {
  const upload = uploads.get(key);
  if (upload) upload.resume();
}

export async function cancel(key: string) {
  const upload = uploads.get(key);
  if (upload) await upload.cancel();
  else patch(key, { state: { ...stateOf(key), phase: "cancelled" } });
}

const stateOf = (key: string) => rows.find((row) => row.key === key)!.state;

export function retryUpload(key: string) {
  const row = rows.find((candidate) => candidate.key === key);
  const upload = uploads.get(key);
  if (!row || !upload) return;
  if (row.state.videoId) return upload.resume();
  const item = items.get(key);
  if (item) launch(key, item);
}

export function resumeWithFile(key: string, file: File) {
  const row = rows.find((candidate) => candidate.key === key);
  if (!row || !row.state.videoId) return;
  const same =
    file.name === row.fileName &&
    file.size === row.size &&
    file.lastModified === row.lastModified;
  if (!same) return patch(key, { wrongFile: true });
  patch(key, { interrupted: false, wrongFile: false });
  launch(
    key,
    {
      file,
      title: row.title,
      language: row.language,
      scope: row.scope,
      assignTo: row.assignTo,
    },
    row.state.videoId,
  );
}

export const settle = (key: string, settled: TrayRow["settled"]) =>
  patch(key, { settled, retryError: null });

export const failRetry = (key: string, retryError: string) =>
  patch(key, { retryError });

export const assignWhenReady = (key: string, elementId: string | undefined) =>
  patch(key, { assignTo: elementId });

export function track(servers: Map<string, VideoStatusView>) {
  let changed = false;
  const next = rows.map((row) => {
    const server = row.state.videoId
      ? servers.get(row.state.videoId)
      : undefined;
    if (!server || server === row.server) return row;
    changed = true;
    return { ...row, server };
  });
  if (changed) set(next);
}

export function dismiss(key: string) {
  uploads.delete(key);
  items.delete(key);
  set(rows.filter((row) => row.key !== key));
}

export async function discardInterrupted(key: string) {
  const row = rows.find((candidate) => candidate.key === key);
  dismiss(key);
  if (row?.state.videoId) await abortVideoUploadAction(row.state.videoId);
}

export const bytesInFlight = () =>
  rows.some((row) =>
    ["starting", "uploading", "completing"].includes(row.state.phase),
  );
