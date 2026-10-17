"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Film,
  Pause,
  Play,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration, wordsLocale, type Locale } from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";
import {
  retryVideoAction,
  updateElementAction,
  type VideoStatusView,
} from "../actions";
import type { UploadTrayStrings } from "./strings";
import {
  bytesInFlight,
  cancel,
  dismiss,
  discardInterrupted,
  enqueue,
  failRetry,
  getServerSnapshot,
  getSnapshot,
  pause,
  resume,
  resumeWithFile,
  retryUpload,
  settle,
  subscribe,
  track,
  type TrayItem,
  type TrayRow,
} from "./upload-store";
import { useVideoStatuses } from "./use-video-statuses";
import { VIDEO_ACCEPT } from "./video-upload";

export type { TrayItem, TrayRow };

export function useUploadTray() {
  return { enqueue };
}

export const useUploadRows = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

const GB = 1024 ** 3;
const MB = 1024 ** 2;

const formatters = new Map<string, Intl.NumberFormat>();
const numberFormat = (locale: Locale, options: Intl.NumberFormatOptions) => {
  const id = `${locale}${JSON.stringify(options)}`;
  let format = formatters.get(id);
  if (!format) {
    format = new Intl.NumberFormat(locale, options);
    formatters.set(id, format);
  }
  return format;
};

const percentOf = (fraction: number, locale: Locale) =>
  numberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(
    Math.min(1, Math.max(0, fraction)),
  );

const unitFor = (total: number) =>
  total >= GB
    ? { unit: "gigabyte", divisor: GB, digits: 2 }
    : { unit: "megabyte", divisor: MB, digits: total >= 100 * MB ? 0 : 1 };

const bytesOf = (bytes: number, total: number, locale: Locale) => {
  const { unit, divisor, digits } = unitFor(total);
  return numberFormat(locale, {
    style: "unit",
    unit,
    unitDisplay: "short",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(bytes / divisor);
};

const speedOf = (bytesPerSecond: number, locale: Locale) =>
  numberFormat(locale, {
    style: "unit",
    unit: "megabyte-per-second",
    unitDisplay: "short",
    maximumFractionDigits: 1,
  }).format(bytesPerSecond / MB);

const timeOf = (seconds: number, locale: Locale) =>
  seconds < 60
    ? numberFormat(locale, {
        style: "unit",
        unit: "second",
        unitDisplay: "short",
        maximumFractionDigits: 0,
      }).format(Math.max(5, Math.ceil(seconds / 5) * 5))
    : formatDuration(seconds, locale);

const UPLOADING = new Set(["starting", "uploading", "paused", "completing"]);

type View = {
  row: TrayRow;
  server: VideoStatusView | undefined;
};

const watched = (row: TrayRow) =>
  row.state.phase === "processing" && row.settled === null && row.state.videoId;

export function UploadTrayProvider({
  strings,
  locale: language,
  children,
}: {
  strings: UploadTrayStrings;
  locale: string;
  children?: ReactNode;
}) {
  const router = useRouter();
  const rows = useUploadRows();
  const locale = wordsLocale(language);
  const [collapsed, setCollapsed] = useState(false);

  const watchKey = rows
    .filter(watched)
    .map((row) => row.state.videoId)
    .join(",");
  const initial = useMemo<VideoStatusView[]>(
    () =>
      watchKey
        ? watchKey.split(",").map((id) => ({
            id,
            status: "queued",
            progress: 0,
            failureCode: null,
            durationSeconds: null,
            poster: null,
          }))
        : [],
    [watchKey],
  );
  const statuses = useVideoStatuses(initial);

  useEffect(() => {
    track(statuses);
  }, [statuses]);

  useEffect(() => {
    for (const row of rows) {
      if (!watched(row)) continue;
      const videoId = row.state.videoId!;
      const server = statuses.get(videoId);
      if (server?.status === "ready") {
        settle(row.key, "ready");
        if (row.assignTo)
          void updateElementAction(row.assignTo, { videoId }).then((result) => {
            if (result.ok) router.refresh();
            else
              failRetry(
                row.key,
                strings.errors[result.error] ?? strings.errors.generic,
              );
          });
      } else if (server?.status === "failed") settle(row.key, "failed");
    }
  }, [rows, statuses, strings, router]);

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (!bytesInFlight()) return;
      event.preventDefault();
      event.returnValue = strings.leaveWarning;
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [strings.leaveWarning]);

  const views: View[] = rows.map((row) => ({
    row,
    server: row.state.videoId ? statuses.get(row.state.videoId) : undefined,
  }));

  const uploading = rows.filter((row) => UPLOADING.has(row.state.phase));
  const processing = rows.filter(watched);
  const loaded = uploading.reduce((sum, row) => sum + row.state.loaded, 0);
  const total = uploading.reduce((sum, row) => sum + row.state.total, 0);
  const overall = total > 0 ? loaded / total : null;

  const summary = uploading.length
    ? `${formatMessage(strings.active, { count: uploading.length }, language)} · ${percentOf(overall ?? 0, locale)}`
    : processing.length
      ? formatMessage(
          strings.processing,
          { count: processing.length },
          language,
        )
      : formatMessage(strings.idle, { count: rows.length }, language);

  return (
    <>
      {children}
      {rows.length > 0 ? (
        <section
          aria-label={strings.label}
          className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 motion-reduce:slide-in-from-bottom-0 md:inset-x-auto md:right-5 md:bottom-5 md:w-96"
        >
          <div className="overflow-hidden rounded-(--r-card) border border-line bg-paper shadow-lift">
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              aria-expanded={!collapsed}
              aria-label={collapsed ? strings.expand : strings.collapse}
              className="relative flex min-h-11 w-full items-center gap-3 px-4 text-left text-2sm font-medium text-ink outline-none hover:bg-canvas-deep focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <Upload
                aria-hidden
                className="size-4 shrink-0 text-ink-soft"
              />
              <span
                className="min-w-0 flex-1 truncate"
                aria-live="polite"
              >
                {summary}
              </span>
              <ChevronDown
                aria-hidden
                className={cn(
                  "size-4 shrink-0 text-ink-soft transition-transform duration-200 motion-reduce:transition-none",
                  collapsed && "rotate-180",
                )}
              />
              {overall !== null ? (
                <ProgressBar
                  fraction={overall}
                  className="absolute inset-x-0 bottom-0 h-0.5 rounded-none"
                />
              ) : null}
            </button>
            {collapsed ? null : (
              <ul className="max-h-80 divide-y divide-line overflow-y-auto border-t border-line">
                {views.map((view) => (
                  <TrayRowItem
                    key={view.row.key}
                    view={view}
                    strings={strings}
                    language={language}
                    locale={locale}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}
    </>
  );
}

function ProgressBar({
  fraction,
  indeterminate = false,
  className,
}: {
  fraction: number;
  indeterminate?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "block h-1 overflow-hidden rounded-full bg-mint-tint",
        className,
      )}
    >
      <span
        className={cn(
          "block h-full origin-left bg-mint transition-transform duration-300 ease-out motion-reduce:transition-none",
          indeterminate && "animate-pulse motion-reduce:animate-none",
        )}
        style={{
          transform: `scaleX(${indeterminate ? 1 : Math.min(1, Math.max(0, fraction))})`,
        }}
      />
    </span>
  );
}

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="text-ink-soft hover:text-ink"
    >
      {children}
    </Button>
  );
}

function Thumbnail({
  poster,
  failed,
}: {
  poster: string | null;
  failed: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <span className="relative grid aspect-video w-13 shrink-0 place-items-center overflow-hidden rounded-md bg-canvas-deep">
      {failed ? (
        <AlertCircle
          aria-hidden
          className="size-4 text-red-ink"
        />
      ) : (
        <Film
          aria-hidden
          className="size-4 text-ink-soft"
        />
      )}
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          onLoad={() => setLoaded(true)}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-500 motion-reduce:transition-none",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      ) : null}
    </span>
  );
}

function TrayRowItem({
  view: { row, server },
  strings,
  language,
  locale,
}: {
  view: View;
  strings: UploadTrayStrings;
  language: string;
  locale: Locale;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const { state } = row;
  const fraction = state.total > 0 ? state.loaded / state.total : 0;
  const percent = percentOf(fraction, locale);
  const serverFailed = row.settled === "failed" || server?.status === "failed";
  const ready = row.settled === "ready" || server?.status === "ready";
  const failed = state.phase === "failed" || serverFailed;

  const describe = (): string => {
    if (row.retryError) return row.retryError;
    if (row.interrupted)
      return row.wrongFile
        ? formatMessage(strings.wrongFile, { name: row.fileName }, language)
        : `${strings.interrupted} · ${strings.resumePick}`;
    if (serverFailed)
      return server?.failureCode
        ? strings.failure[server.failureCode]
        : strings.errors.generic;
    if (state.phase === "failed")
      return strings.errors[state.error ?? "generic"] ?? strings.errors.generic;
    if (state.phase === "cancelled") return strings.cancelled;
    if (ready) return strings.ready;
    if (state.phase === "starting") return strings.starting;
    if (state.phase === "completing") return strings.finishing;
    if (state.phase === "paused")
      return formatMessage(strings.paused, { percent }, language);
    if (state.phase === "processing")
      return server && server.status === "processing"
        ? formatMessage(
            strings.transcoding,
            { percent: percentOf(server.progress / 100, locale) },
            language,
          )
        : strings.queued;
    const parts = [
      formatMessage(
        strings.progress,
        {
          percent,
          loaded: bytesOf(state.loaded, state.total, locale),
          total: bytesOf(state.total, state.total, locale),
        },
        language,
      ),
    ];
    if (state.speed > 0) parts.push(speedOf(state.speed, locale));
    parts.push(
      state.eta === null
        ? strings.calculating
        : formatMessage(
            strings.remaining,
            { time: timeOf(state.eta, locale) },
            language,
          ),
    );
    return parts.join(" · ");
  };

  const line = describe();

  const barFraction =
    state.phase === "processing" ? (server?.progress ?? 0) / 100 : fraction;
  const showBar =
    !failed && !ready && !row.interrupted && state.phase !== "cancelled";

  const finished = ready || failed || state.phase === "cancelled";
  const title = (
    <span className="truncate font-medium text-ink">{row.title}</span>
  );

  return (
    <li className="flex items-center gap-3 px-4 py-3 text-2sm">
      <Thumbnail
        poster={ready ? (server?.poster ?? null) : null}
        failed={failed}
      />
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex min-w-0 items-center gap-1">
          {title}
          {ready ? (
            <CheckCircle2
              aria-hidden
              className="size-3.5 shrink-0 text-mint-ink"
            />
          ) : null}
        </div>
        <p
          className={cn(
            "truncate text-xs tabular-nums",
            failed || row.wrongFile || row.retryError
              ? "text-red-ink"
              : "text-ink-soft",
          )}
          title={line}
        >
          {line}
        </p>
        {showBar ? (
          <ProgressBar
            fraction={barFraction}
            indeterminate={
              state.phase === "starting" ||
              state.phase === "completing" ||
              (state.phase === "processing" && server?.status !== "processing")
            }
          />
        ) : null}
      </div>
      <div className="flex shrink-0 items-center">
        {row.interrupted ? (
          <>
            <input
              ref={fileInput}
              type="file"
              accept={VIDEO_ACCEPT}
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) resumeWithFile(row.key, file);
              }}
            />
            <IconAction
              label={strings.resume}
              onClick={() => fileInput.current?.click()}
            >
              <Play aria-hidden />
            </IconAction>
            <IconAction
              label={strings.dismiss}
              onClick={() => void discardInterrupted(row.key)}
            >
              <X aria-hidden />
            </IconAction>
          </>
        ) : (
          <>
            {state.phase === "uploading" ? (
              <IconAction
                label={strings.pause}
                onClick={() => pause(row.key)}
              >
                <Pause aria-hidden />
              </IconAction>
            ) : null}
            {state.phase === "paused" ? (
              <IconAction
                label={strings.resume}
                onClick={() => resume(row.key)}
              >
                <Play aria-hidden />
              </IconAction>
            ) : null}
            {state.phase === "failed" ? (
              <IconAction
                label={strings.retry}
                onClick={() => retryUpload(row.key)}
              >
                <RotateCcw aria-hidden />
              </IconAction>
            ) : null}
            {serverFailed && state.videoId ? (
              <IconAction
                label={strings.retry}
                onClick={async () => {
                  const result = await retryVideoAction(state.videoId!);
                  if (result.ok) settle(row.key, null);
                  else {
                    failRetry(
                      row.key,
                      strings.errors[result.error] ?? strings.errors.generic,
                    );
                    haptics.error();
                  }
                }}
              >
                <RotateCcw aria-hidden />
              </IconAction>
            ) : null}
            {UPLOADING.has(state.phase) && state.phase !== "completing" ? (
              <IconAction
                label={strings.cancel}
                onClick={() => void cancel(row.key)}
              >
                <X aria-hidden />
              </IconAction>
            ) : null}
            {finished || state.phase === "processing" ? (
              <IconAction
                label={strings.dismiss}
                onClick={() => dismiss(row.key)}
              >
                <X aria-hidden />
              </IconAction>
            ) : null}
          </>
        )}
      </div>
    </li>
  );
}
