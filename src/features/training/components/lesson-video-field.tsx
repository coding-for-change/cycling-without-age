"use client";

import { useRef, useState, useTransition } from "react";
import { AlertCircle, RefreshCw, Trash2, Upload, X } from "lucide-react";
import { reportSave, type SaveLabels } from "@/components/action-feedback";
import { useSaveStatus } from "@/components/save-status";
import { Button } from "@/components/ui/button";
import { useFileDrop } from "@/hooks/use-file-drop";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import { updateElementAction } from "../actions";
import type { ContentLanguage } from "../schemas";
import type { VideoPickerStrings } from "./strings";
import { assignWhenReady } from "./upload-store";
import { percentLabel, progressOf } from "./upload-progress";
import { useUploadRows } from "./upload-tray";
import {
  sizeLimitOf,
  useStartUploads,
  type UploadLimits,
} from "./use-start-uploads";
import {
  VideoLibraryModal,
  type LibraryVideoView,
  type VideoPick,
} from "./video-library-modal";
import { VideoPoster } from "./video-poster";
import { VIDEO_ACCEPT } from "./video-upload";

export type LessonVideo = {
  id: string;
  title: string;
  meta: string | null;
  poster: string | null;
  archived: boolean;
};

export type LessonVideoLabels = {
  replace: string;
  remove: string;
  set: string;
  removed: string;
  uploading: string;
  preparing: string;
  pending: string;
  archived: string;
  save: SaveLabels;
};

export function LessonVideoField({
  elementId,
  video,
  videos,
  courseLanguage,
  languages,
  scope,
  limits,
  language,
  strings,
  labels,
}: {
  elementId: string;
  video: LessonVideo | null;
  videos: LibraryVideoView[];
  courseLanguage: ContentLanguage;
  languages: { value: ContentLanguage; label: string }[];
  scope?: string;
  limits: UploadLimits;
  language: string;
  strings: VideoPickerStrings;
  labels: LessonVideoLabels;
}) {
  const report = useSaveStatus();
  const rows = useUploadRows();
  const input = useRef<HTMLInputElement>(null);
  const [library, setLibrary] = useState(false);
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useState<LessonVideo | null>(video);
  const [synced, setSynced] = useState(video);
  if (synced !== video) {
    setSynced(video);
    setShown(video);
  }
  const uploads = useStartUploads({
    scope,
    limits,
    invalid: strings.upload.invalid,
    language,
  });
  const { dragging, handlers } = useFileDrop(
    (files) => void uploads.start(files.slice(0, 1), courseLanguage, elementId),
  );

  const upload = rows.find((row) => {
    if (row.assignTo !== elementId) return false;
    const kind = progressOf(row).kind;
    return kind !== "gone" && kind !== "ready";
  });
  const uploadProgress = upload ? progressOf(upload) : null;

  const save = (next: LessonVideo | null, previous: LessonVideo | null) => {
    setShown(next);
    report("saving");
    startTransition(async () => {
      const ok = reportSave(
        await updateElementAction(elementId, { videoId: next?.id ?? null }),
        {
          report,
          labels: { ...labels.save, saved: next ? labels.set : labels.removed },
          undo: () => save(previous, next),
        },
      );
      if (!ok) setShown(previous);
    });
  };

  const pick = (choice: VideoPick) => {
    if ("pendingKey" in choice) {
      for (const row of rows)
        if (row.assignTo === elementId && row.key !== choice.pendingKey)
          assignWhenReady(row.key, undefined);
      return;
    }
    const found = videos.find((candidate) => candidate.id === choice.videoId);
    if (!found) return;
    if (upload) assignWhenReady(upload.key, undefined);
    save(
      {
        id: found.id,
        title: found.title,
        meta: found.duration,
        poster: found.poster,
        archived: found.archived,
      },
      shown,
    );
  };

  const hint = formatMessage(
    strings.upload.hint,
    { size: sizeLimitOf(limits.maxBytes, language) },
    language,
  );

  const picker = (
    <>
      <input
        ref={input}
        type="file"
        accept={VIDEO_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          void uploads.start(files.slice(0, 1), courseLanguage, elementId);
        }}
      />
      <VideoLibraryModal
        open={library}
        onOpenChange={setLibrary}
        videos={videos}
        currentVideoId={shown?.id ?? null}
        courseLanguage={courseLanguage}
        languages={languages}
        elementId={elementId}
        scope={scope}
        limits={limits}
        language={language}
        strings={strings}
        onPick={pick}
      />
    </>
  );

  const actions = (
    <div className="flex flex-wrap items-center gap-1.25">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={labels.replace}
        title={labels.replace}
        disabled={pending}
        onClick={() => setLibrary(true)}
        className="size-9 text-ink-soft hover:text-ink"
      >
        <RefreshCw aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={labels.remove}
        title={labels.remove}
        disabled={pending}
        onClick={() => {
          if (upload) assignWhenReady(upload.key, undefined);
          if (shown) save(null, shown);
        }}
        className="size-9 text-ink-soft hover:bg-red-tint hover:text-red-ink"
      >
        <Trash2 aria-hidden />
      </Button>
    </div>
  );

  if (upload && uploadProgress) {
    const failed = uploadProgress.kind === "failed";
    const line =
      uploadProgress.kind === "uploading"
        ? formatMessage(
            labels.uploading,
            { percent: percentLabel(uploadProgress.fraction, language) },
            language,
          )
        : uploadProgress.kind === "preparing"
          ? formatMessage(
              labels.preparing,
              { percent: percentLabel(uploadProgress.fraction, language) },
              language,
            )
          : failed
            ? upload.server?.failureCode
              ? strings.failure[upload.server.failureCode]
              : strings.failed
            : strings.queued;
    const fraction =
      uploadProgress.kind === "uploading" || uploadProgress.kind === "preparing"
        ? uploadProgress.fraction
        : null;
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-4 rounded-(--r-card) border p-3",
          failed ? "border-red-ink/40 bg-red-tint/40" : "border-line",
        )}
      >
        <span className="relative grid aspect-video w-36 shrink-0 place-items-center overflow-hidden rounded-lg bg-canvas-deep text-ink-soft">
          {failed ? (
            <AlertCircle
              aria-hidden
              className="size-5 text-red-ink"
            />
          ) : (
            <Upload
              aria-hidden
              className="size-5"
            />
          )}
        </span>
        <div className="grid min-w-0 flex-1 gap-1.25">
          <span className="truncate text-sm font-medium text-ink">
            {upload.title}
          </span>
          <span
            aria-live="polite"
            className={cn(
              "text-xs tabular-nums",
              failed ? "text-red-ink" : "text-ink-soft",
            )}
          >
            {line}
          </span>
          {failed ? null : (
            <>
              <span
                aria-hidden
                className="block h-1 max-w-xs overflow-hidden rounded-full bg-mint-tint"
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
              <span className="text-xs text-pretty text-ink-soft">
                {labels.pending}
              </span>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.25">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={labels.replace}
            title={labels.replace}
            onClick={() => setLibrary(true)}
            className="size-9 text-ink-soft hover:text-ink"
          >
            <RefreshCw aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={labels.remove}
            title={labels.remove}
            onClick={() => assignWhenReady(upload.key, undefined)}
            className="size-9 text-ink-soft hover:text-ink"
          >
            <X aria-hidden />
          </Button>
        </div>
        {picker}
      </div>
    );
  }

  if (shown)
    return (
      <div
        aria-busy={pending}
        className="flex flex-wrap items-center gap-4 rounded-(--r-card) border border-line p-3"
      >
        <VideoPoster
          src={shown.poster}
          className="w-36 rounded-lg"
        />
        <div className="grid min-w-0 flex-1 gap-0.5">
          <span className="truncate text-sm font-medium text-ink">
            {shown.title}
          </span>
          <span className="text-xs text-ink-soft tabular-nums">
            {[shown.meta, shown.archived ? labels.archived : null]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
        {actions}
        {picker}
      </div>
    );

  return (
    <div
      {...handlers}
      className={cn(
        "grid place-items-center gap-3 rounded-(--r-card) border border-dashed px-5 py-10 text-center transition-colors duration-200 motion-reduce:transition-none",
        dragging ? "border-mint-deep bg-mint-tint" : "border-line",
      )}
    >
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={uploads.checking}
          onClick={() => input.current?.click()}
        >
          {strings.upload.new}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setLibrary(true)}
        >
          {strings.upload.select}
        </Button>
      </div>
      <p className="text-2sm text-ink-soft">
        {dragging ? strings.upload.dropRelease : hint}
      </p>
      {uploads.error ? (
        <p
          role="alert"
          className="text-2sm text-red-ink"
        >
          {uploads.error}
        </p>
      ) : null}
      {picker}
    </div>
  );
}
