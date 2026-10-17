"use client";

import { useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Languages,
  Search,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useFileDrop } from "@/hooks/use-file-drop";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import type {
  ContentLanguage,
  TrainingVideoStatusName,
  VideoFailureCode,
} from "../schemas";
import { NESTED_DIALOG } from "./large-dialog";
import type { VideoPickerStrings } from "./strings";
import { assignWhenReady, type TrayRow } from "./upload-store";
import {
  percentLabel,
  progressOf,
  type UploadProgress,
} from "./upload-progress";
import { useUploadRows } from "./upload-tray";
import {
  sizeLimitOf,
  useStartUploads,
  type UploadLimits,
} from "./use-start-uploads";
import { VIDEO_ACCEPT } from "./video-upload";
import { VideoPoster } from "./video-poster";

export type LibraryVideoView = {
  id: string;
  title: string;
  language: string;
  status: TrainingVideoStatusName;
  progress: number;
  failureCode: VideoFailureCode | null;
  duration: string | null;
  poster: string | null;
  archived: boolean;
};

export type VideoPick = { videoId: string } | { pendingKey: string };

type Tile = {
  key: string;
  title: string;
  language: string;
  poster: string | null;
  meta: string | null;
  progress: UploadProgress;
  failure: string | null;
  pick: VideoPick | null;
};

const ALL = "all";

const statusProgress = (video: LibraryVideoView): UploadProgress =>
  video.status === "ready"
    ? { kind: "ready" }
    : video.status === "failed"
      ? { kind: "failed" }
      : video.status === "processing"
        ? { kind: "preparing", fraction: video.progress / 100 }
        : { kind: "queued" };

export function VideoLibraryModal({
  open,
  onOpenChange,
  videos,
  currentVideoId,
  courseLanguage,
  languages,
  elementId,
  scope,
  limits,
  language,
  strings,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videos: LibraryVideoView[];
  currentVideoId: string | null;
  courseLanguage: ContentLanguage;
  languages: { value: ContentLanguage; label: string }[];
  elementId: string;
  scope?: string;
  limits: UploadLimits;
  language: string;
  strings: VideoPickerStrings;
  onPick: (pick: VideoPick) => void;
}) {
  const rows = useUploadRows();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>(courseLanguage);
  const [selected, setSelected] = useState<string | null>(null);
  const uploads = useStartUploads({
    scope,
    limits,
    invalid: strings.upload.invalid,
    language,
  });

  const uploadLanguage = (
    filter === ALL ? courseLanguage : filter
  ) as ContentLanguage;

  const send = async (files: File[]) => {
    const keys = await uploads.start(files, uploadLanguage);
    const last = keys.at(-1);
    if (last) setSelected(`upload:${last}`);
  };

  const { dragging, handlers } = useFileDrop((files) => void send(files));

  const tiles = tilesOf(videos, rows, currentVideoId, strings);
  const needle = query.trim().toLocaleLowerCase();
  const shown = tiles.filter(
    (tile) =>
      (filter === ALL || tile.language === filter) &&
      (!needle || tile.title.toLocaleLowerCase().includes(needle)),
  );
  const chosen = tiles.find((tile) => tile.key === selected) ?? null;
  const unchanged =
    chosen?.pick && "videoId" in chosen.pick
      ? chosen.pick.videoId === currentVideoId
      : false;
  const filterLabel =
    filter === ALL
      ? strings.allLanguages
      : (languages.find((option) => option.value === filter)?.label ?? filter);

  const close = () => {
    setSelected(null);
    setQuery("");
    uploads.clearError();
    onOpenChange(false);
  };

  const done = () => {
    if (!chosen?.pick || unchanged) return close();
    if ("pendingKey" in chosen.pick)
      assignWhenReady(chosen.pick.pendingKey, elementId);
    onPick(chosen.pick);
    close();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      <DialogContent
        showCloseButton={false}
        className={NESTED_DIALOG}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            done();
          }
        }}
      >
        <header className="flex items-center gap-3 px-5 pt-5 pb-3">
          <DialogTitle className="min-w-0 flex-1 truncate text-lg font-semibold text-ink">
            {strings.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {formatMessage(
              strings.upload.hint,
              { size: sizeLimitOf(limits.maxBytes, language) },
              language,
            )}
          </DialogDescription>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={strings.cancel}
            onClick={close}
            className="size-11 rounded-full text-ink-soft hover:text-ink"
          >
            <X aria-hidden />
          </Button>
        </header>

        <div className="grid gap-3 px-5 pb-4">
          <label className="relative block">
            <span className="sr-only">{strings.search}</span>
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-soft"
            />
            <Input
              type="search"
              value={query}
              placeholder={strings.search}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 rounded-(--r-card) border-line pl-10 text-base"
            />
          </label>
          <div className="flex flex-wrap items-center gap-1.25">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`${strings.languageFilter}: ${filterLabel}`}
                  className="inline-flex h-8 items-center gap-1.25 rounded-full border border-dashed border-line px-3 text-2sm text-ink transition-colors hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none data-[state=open]:bg-canvas-deep"
                >
                  <Languages
                    aria-hidden
                    className="size-3.5 text-ink-soft"
                  />
                  {filterLabel}
                  <ChevronDown
                    aria-hidden
                    className="size-3.5 text-ink-soft"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuRadioGroup
                  value={filter}
                  onValueChange={setFilter}
                >
                  <DropdownMenuRadioItem value={ALL}>
                    {strings.allLanguages}
                  </DropdownMenuRadioItem>
                  {languages.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div
          {...handlers}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5"
        >
          <div
            className={cn(
              "grid place-items-center gap-3 rounded-(--r-card) border border-dashed px-5 py-8 text-center transition-colors duration-200 motion-reduce:transition-none",
              dragging ? "border-mint-deep bg-mint-tint" : "border-line",
            )}
          >
            <input
              ref={input}
              type="file"
              multiple
              accept={VIDEO_ACCEPT}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                event.target.value = "";
                void send(files);
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={uploads.checking}
              onClick={() => input.current?.click()}
            >
              <Upload aria-hidden />
              {strings.upload.new}
            </Button>
            <p className="grid gap-0.5 text-2sm text-ink-soft">
              <span>
                {dragging
                  ? strings.upload.dropRelease
                  : strings.upload.dropFiles}
              </span>
              <span className="text-xs">
                {formatMessage(
                  strings.upload.hint,
                  { size: sizeLimitOf(limits.maxBytes, language) },
                  language,
                )}
              </span>
            </p>
            {uploads.error ? (
              <p
                role="alert"
                className="text-2sm text-red-ink"
              >
                {uploads.error}
              </p>
            ) : null}
          </div>

          {shown.length > 0 ? (
            <ul
              role="listbox"
              aria-label={strings.title}
              className="grid grid-cols-2 gap-3 pt-5 sm:grid-cols-3 lg:grid-cols-4"
            >
              {shown.map((tile) => (
                <VideoTile
                  key={tile.key}
                  tile={tile}
                  selected={tile.key === selected}
                  current={
                    tile.pick !== null &&
                    "videoId" in tile.pick &&
                    tile.pick.videoId === currentVideoId
                  }
                  language={language}
                  strings={strings}
                  onSelect={() => setSelected(tile.key)}
                  onConfirm={() => {
                    setSelected(tile.key);
                    if (tile.pick) {
                      if ("pendingKey" in tile.pick)
                        assignWhenReady(tile.pick.pendingKey, elementId);
                      onPick(tile.pick);
                      close();
                    }
                  }}
                />
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-2sm text-pretty text-ink-soft">
              {tiles.length === 0 ? strings.empty : strings.none}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-line px-5 py-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={close}
          >
            {strings.cancel}
          </Button>
          <Button
            type="button"
            variant="brand"
            disabled={!chosen?.pick || unchanged}
            onClick={done}
            className="min-h-11 min-w-24"
          >
            {strings.done}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function tilesOf(
  videos: LibraryVideoView[],
  rows: TrayRow[],
  currentVideoId: string | null,
  strings: VideoPickerStrings,
): Tile[] {
  const byId = new Map(videos.map((video) => [video.id, video]));
  const fromRows: Tile[] = [];
  const covered = new Set<string>();
  for (const row of rows) {
    const progress = progressOf(row);
    if (progress.kind === "gone") continue;
    const videoId = row.state.videoId;
    const known = videoId ? byId.get(videoId) : undefined;
    if (known?.status === "ready" || (progress.kind === "ready" && known))
      continue;
    if (videoId) covered.add(videoId);
    const failureCode = row.server?.failureCode ?? null;
    fromRows.push({
      key: `upload:${row.key}`,
      title: row.title,
      language: row.language,
      poster: row.server?.poster ?? null,
      meta: null,
      progress,
      failure: failureCode ? strings.failure[failureCode] : null,
      pick:
        progress.kind === "failed"
          ? null
          : progress.kind === "ready" && videoId
            ? { videoId }
            : { pendingKey: row.key },
    });
  }
  const fromServer: Tile[] = videos
    .filter(
      (video) =>
        !covered.has(video.id) &&
        video.status !== "uploading" &&
        (!video.archived || video.id === currentVideoId),
    )
    .map((video) => ({
      key: `video:${video.id}`,
      title: video.title,
      language: video.language,
      poster: video.poster,
      meta: video.archived ? strings.archived : video.duration,
      progress: statusProgress(video),
      failure: video.failureCode ? strings.failure[video.failureCode] : null,
      pick: video.status === "ready" ? { videoId: video.id } : null,
    }));
  return [...fromRows, ...fromServer];
}

function VideoTile({
  tile,
  selected,
  current,
  language,
  strings,
  onSelect,
  onConfirm,
}: {
  tile: Tile;
  selected: boolean;
  current: boolean;
  language: string;
  strings: VideoPickerStrings;
  onSelect: () => void;
  onConfirm: () => void;
}) {
  const { progress } = tile;
  const disabled = tile.pick === null;
  const line =
    progress.kind === "uploading"
      ? formatMessage(
          strings.uploading,
          { percent: percentLabel(progress.fraction, language) },
          language,
        )
      : progress.kind === "preparing"
        ? formatMessage(
            strings.preparing,
            { percent: percentLabel(progress.fraction, language) },
            language,
          )
        : progress.kind === "queued"
          ? strings.queued
          : progress.kind === "failed"
            ? (tile.failure ?? strings.failed)
            : tile.meta;
  const fraction =
    progress.kind === "uploading" || progress.kind === "preparing"
      ? progress.fraction
      : null;

  return (
    <li
      role="option"
      aria-selected={selected}
      aria-disabled={disabled}
      className="min-w-0"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        onDoubleClick={onConfirm}
        title={
          disabled && progress.kind !== "failed" ? strings.notReady : tile.title
        }
        className={cn(
          "group grid w-full gap-2 rounded-(--r-card) p-1.25 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ink disabled:cursor-default",
          selected ? "bg-mint-tint" : "hover:bg-canvas-deep",
        )}
      >
        <span
          className={cn(
            "relative block overflow-hidden rounded-lg ring-2 ring-transparent transition-shadow motion-reduce:transition-none",
            selected && "ring-mint-deep",
          )}
        >
          <VideoPoster
            src={tile.poster}
            className={cn(
              "w-full rounded-lg",
              (progress.kind === "uploading" ||
                progress.kind === "preparing" ||
                progress.kind === "queued") &&
                "opacity-70",
            )}
          />
          {progress.kind === "failed" ? (
            <span className="absolute inset-0 grid place-items-center bg-red-tint/80 text-red-ink">
              <AlertCircle
                aria-hidden
                className="size-5"
              />
            </span>
          ) : null}
          {fraction !== null || progress.kind === "queued" ? (
            <span
              aria-hidden
              className="absolute inset-x-2 bottom-2 block h-1 overflow-hidden rounded-full bg-paper/80"
            >
              <span
                className={cn(
                  "block h-full origin-left bg-mint-deep transition-transform duration-300 ease-out motion-reduce:transition-none",
                  fraction === null &&
                    "animate-pulse motion-reduce:animate-none",
                )}
                style={{
                  transform: `scaleX(${fraction === null ? 1 : Math.max(0.02, fraction)})`,
                }}
              />
            </span>
          ) : null}
          {selected || current ? (
            <span
              className={cn(
                "absolute top-2 right-2 grid size-6 place-items-center rounded-full",
                selected ? "bg-mint-deep text-white" : "bg-paper text-ink",
              )}
            >
              <Check
                aria-hidden
                className="size-3.5"
              />
              <span className="sr-only">{strings.selected}</span>
            </span>
          ) : null}
        </span>
        <span className="grid min-w-0 gap-0.5 px-1 pb-1">
          <span className="truncate text-2sm font-medium text-ink">
            {tile.title}
          </span>
          <span
            className={cn(
              "truncate text-xs tabular-nums",
              progress.kind === "failed" ? "text-red-ink" : "text-ink-soft",
            )}
          >
            {line ?? " "}
          </span>
        </span>
      </button>
    </li>
  );
}
