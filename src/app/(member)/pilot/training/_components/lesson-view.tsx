"use client";

/// <reference types="react/canary" />
import {
  ViewTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { preconnect, preload } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  FileText,
  ListOrdered,
} from "lucide-react";
import { toast } from "sonner";
import { RichText } from "@/components/markdown";
import {
  LazyTrainingPlayer,
  preloadTrainingPlayer,
  type TrainingPlayerHandle,
} from "@/components/training-player-lazy";
import type { TrainingPlayerStrings } from "@/components/training-player-strings";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";
import {
  MEMBER_ENTER,
  MEMBER_EXIT,
} from "../../../_components/member-transitions";
import { acknowledgeLessonAction } from "../actions";
import {
  formatClock,
  posterTransitionName,
  withTrainingMotion,
} from "./format";
import { LessonOutline } from "./lesson-outline";
import { useLiveProgress } from "./live-progress";
import type { CourseOutline } from "./outline";
import { useHeartbeat } from "./use-heartbeat";

const LESSON_ENTER = withTrainingMotion(MEMBER_ENTER);
const LESSON_EXIT = withTrainingMotion(MEMBER_EXIT);

const COMPLETE_RATIO = 0.9;
const RESUME_MIN_SECONDS = 5;
const RESUME_TAIL_SECONDS = 10;
const STATE_STEP_SECONDS = 0.5;
const CONTINUOUS_GAP_SECONDS = 2;

const originOf = (url: string) => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

export type LessonViewData = {
  id: string;
  title: string;
  body: string | null;
  attachmentHref: string | null;
  durationSeconds: number | null;
  playback: { src: string; poster: string; posterSmall: string } | null;
};

export type LessonStrings = Dictionary["pilot"]["training"]["lesson"];

export type NextStep = {
  href: string;
  kind: "lesson" | "quiz" | "finish";
  poster: string | null;
};

export function LessonView({
  courseId,
  courseTitle,
  lesson,
  progress,
  index,
  total,
  next,
  previousHref,
  outline,
  strings,
  player,
  language,
}: {
  courseId: string;
  courseTitle: string;
  lesson: LessonViewData;
  progress: {
    furthestSeconds: number;
    positionSeconds: number;
    completed: boolean;
  } | null;
  index: number;
  total: number;
  next: NextStep;
  previousHref: string | null;
  outline: CourseOutline;
  strings: LessonStrings;
  player: TrainingPlayerStrings;
  language: string;
}) {
  const router = useRouter();
  const live = useLiveProgress();
  const report = live?.report;
  const playerRef = useRef<TrainingPlayerHandle>(null);
  const hasVideo = lesson.playback !== null;

  const [duration, setDuration] = useState(lesson.durationSeconds ?? 0);
  const [completed, setCompleted] = useState(progress?.completed ?? false);
  const [furthest, setFurthest] = useState(progress?.furthestSeconds ?? 0);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [acknowledging, startAcknowledge] = useTransition();
  const furthestRef = useRef(progress?.furthestSeconds ?? 0);
  const positionRef = useRef(progress?.positionSeconds ?? 0);
  const completedRef = useRef(progress?.completed ?? false);
  const resumed = useRef(false);

  const isDone = completed || (progress?.completed ?? false);
  const threshold = duration * COMPLETE_RATIO;
  const fill = isDone
    ? 1
    : threshold > 0
      ? Math.min(1, furthest / threshold)
      : 0;
  const [startAt] = useState(() =>
    hasVideo &&
    progress &&
    progress.positionSeconds > RESUME_MIN_SECONDS &&
    (lesson.durationSeconds === null ||
      progress.positionSeconds < lesson.durationSeconds - RESUME_TAIL_SECONDS)
      ? progress.positionSeconds
      : undefined,
  );

  const mediaOrigin = lesson.playback ? originOf(lesson.playback.src) : null;
  if (mediaOrigin) preconnect(mediaOrigin, { crossOrigin: "anonymous" });
  if (next.poster) preload(next.poster, { as: "image" });

  const heartbeat = useHeartbeat({
    courseId,
    lessonId: lesson.id,
    enabled: hasVideo,
    read: () => ({
      position: positionRef.current,
      furthest: furthestRef.current,
    }),
  });

  useEffect(() => {
    void preloadTrainingPlayer();
  }, []);

  useEffect(() => {
    router.prefetch(next.href);
  }, [router, next.href]);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setCompleted(true);
    setJustUnlocked(true);
    report?.(lesson.id, { completed: true, fresh: true, ratio: 1 });
    haptics.success();
    void heartbeat.send(true).then(() => router.refresh());
  }, [heartbeat, lesson.id, report, router]);

  const onTime = (seconds: number) => {
    positionRef.current = seconds;
    if (seconds > furthestRef.current + CONTINUOUS_GAP_SECONDS) return;
    if (seconds <= furthestRef.current) return;
    furthestRef.current = seconds;
    if (seconds - furthest >= STATE_STEP_SECONDS) {
      setFurthest(seconds);
      if (duration > 0)
        report?.(lesson.id, { ratio: Math.min(1, seconds / duration) });
    }
    if (duration > 0 && seconds >= duration * COMPLETE_RATIO) finish();
  };

  const onReady = ({ duration: measured }: { duration: number }) => {
    if (Number.isFinite(measured) && measured > 0) setDuration(measured);
    if (startAt !== undefined && !resumed.current) {
      resumed.current = true;
      toast(
        formatMessage(strings.resume, { time: formatClock(startAt) }, language),
        {
          action: {
            label: strings.startOver,
            onClick: () => playerRef.current?.seek(0),
          },
        },
      );
    }
  };

  const nextTransition = next.kind === "finish" ? "pop" : "push";

  const goNext = useCallback(() => {
    router.push(next.href, { transitionTypes: [nextTransition] });
  }, [next.href, nextTransition, router]);

  useEffect(() => {
    if (!isDone) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "n" && event.key !== "N") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable=true]")) return;
      event.preventDefault();
      goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDone, goNext]);

  const acknowledge = () =>
    startAcknowledge(async () => {
      const result = await acknowledgeLessonAction(courseId, lesson.id);
      if (!result.ok) {
        haptics.error();
        toast.error(strings.keepWatching);
        return;
      }
      completedRef.current = true;
      setCompleted(true);
      report?.(lesson.id, { completed: true, fresh: true, ratio: 1 });
      haptics.success();
      router.push(next.href, {
        transitionTypes: [next.kind === "finish" ? "pop" : "push"],
      });
    });

  const nextLabel =
    next.kind === "quiz"
      ? strings.toQuiz
      : next.kind === "finish"
        ? strings.finish
        : strings.next;

  const nextButton = (className?: string) =>
    !hasVideo && !isDone ? (
      <Button
        variant="brand"
        onClick={acknowledge}
        disabled={acknowledging}
        className={cn("min-h-12 rounded-full px-5", className)}
      >
        <BookOpenCheck aria-hidden />
        {strings.markRead}
      </Button>
    ) : isDone ? (
      <Button
        asChild
        variant="brand"
        className={cn(
          "min-h-12 rounded-full px-5",
          justUnlocked && "animate-training-pulse",
          className,
        )}
      >
        <Link
          href={next.href}
          prefetch
          transitionTypes={[nextTransition]}
          onPointerEnter={() => void preloadTrainingPlayer()}
          onFocus={() => void preloadTrainingPlayer()}
          onTouchStart={() => void preloadTrainingPlayer()}
        >
          {nextLabel}
          <ArrowRight aria-hidden />
        </Link>
      </Button>
    ) : (
      <span
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fill * 100)}
        aria-label={strings.keepWatching}
        className={cn(
          "relative inline-flex min-h-12 items-center justify-center overflow-hidden rounded-full bg-canvas-deep px-5 text-sm font-medium text-ink-soft",
          className,
        )}
      >
        <span
          aria-hidden
          className="absolute inset-0 origin-left bg-mint/60 transition-transform duration-700 ease-out motion-reduce:transition-none"
          style={{ transform: `scaleX(${fill})` }}
        />
        <span className="relative">{strings.keepWatching}</span>
      </span>
    );

  return (
    <ViewTransition
      enter={LESSON_ENTER}
      exit={LESSON_EXIT}
      default="none"
    >
      <article className="flex flex-1 flex-col gap-5 pb-32 lg:pb-8">
        {lesson.playback ? (
          <ViewTransition name={posterTransitionName(courseId)}>
            <div className="overflow-hidden bg-mint-deep lg:rounded-2xl lg:shadow-lift">
              <LazyTrainingPlayer
                ref={playerRef}
                src={lesson.playback.src}
                poster={lesson.playback.poster}
                title={lesson.title}
                strings={player}
                locale={language}
                seekLimit={isDone ? undefined : furthest}
                startAt={startAt}
                fallbackClassName="rounded-none"
                onTime={onTime}
                onReady={onReady}
                onPlay={() => {
                  heartbeat.setPlaying(true);
                  void heartbeat.send();
                }}
                onPause={() => {
                  heartbeat.setPlaying(false);
                  void heartbeat.send();
                }}
                onSeeked={(seconds) => {
                  positionRef.current = seconds;
                  void heartbeat.send();
                }}
                onEnded={() => {
                  heartbeat.setPlaying(false);
                  if (duration > 0) onTime(duration);
                  void heartbeat.send(true);
                }}
              />
            </div>
          </ViewTransition>
        ) : null}

        <header className="grid gap-1.5 px-4 lg:px-0">
          <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-ink-soft uppercase">
            <span>
              {formatMessage(strings.of, { index: index + 1, total }, language)}
            </span>
            <span
              aria-hidden
              className="lg:hidden"
            >
              ·
            </span>
            <span className="truncate normal-case lg:hidden">
              {courseTitle}
            </span>
          </p>
          <div className="flex items-start gap-3">
            <h1 className="min-w-0 flex-1 text-2xl tracking-tight md:text-3xl">
              {lesson.title}
            </h1>
            {isDone ? (
              <span className="mt-1 flex shrink-0 items-center gap-1 rounded-full bg-mint-tint px-2.5 py-1 text-xs font-medium text-mint-ink">
                <Check
                  className={cn(
                    "size-3.5",
                    justUnlocked && "animate-training-check",
                  )}
                  strokeWidth={3}
                  aria-hidden
                />
                {strings.completed}
              </span>
            ) : null}
          </div>
        </header>

        {lesson.body ? (
          <RichText
            text={lesson.body}
            className="px-4 text-base leading-relaxed lg:px-0 [&_h1]:text-lg [&_h2]:text-lg"
          />
        ) : null}

        {lesson.attachmentHref ? (
          <a
            href={lesson.attachmentHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mx-4 flex max-w-md items-center gap-3 rounded-2xl border border-line bg-canvas p-3 transition-colors hover:bg-canvas-deep motion-reduce:transition-none lg:mx-0"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-mint-tint text-mint-ink">
              <FileText
                className="size-5"
                aria-hidden
              />
            </span>
            <span className="grid min-w-0 gap-0.5">
              <span className="truncate text-sm font-medium">
                {strings.attachment}
              </span>
              <span className="text-xs text-ink-soft">
                {strings.attachmentHint}
              </span>
            </span>
          </a>
        ) : null}

        <div className="hidden items-center justify-between gap-3 border-t border-line pt-5 lg:flex">
          {previousHref ? (
            <Button
              asChild
              variant="ghost"
              className="min-h-12 rounded-full px-4"
            >
              <Link
                href={previousHref}
                prefetch
                transitionTypes={["pop"]}
              >
                <ArrowLeft aria-hidden />
                {strings.previous}
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            {isDone ? (
              <span className="text-xs text-ink-soft pointer-coarse:hidden">
                {strings.nextHint}
              </span>
            ) : null}
            {nextButton()}
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <Sheet
              open={sheetOpen}
              onOpenChange={setSheetOpen}
            >
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="min-h-12 shrink-0 rounded-full border-line px-4"
                >
                  <ListOrdered aria-hidden />
                  <span className="tabular-nums">
                    {index + 1}/{total}
                  </span>
                  <span className="sr-only">{strings.outline}</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="max-h-[85dvh] overflow-y-auto rounded-t-(--r-tile) px-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
              >
                <SheetHeader className="px-3">
                  <SheetTitle className="text-left">{courseTitle}</SheetTitle>
                </SheetHeader>
                <LessonOutline
                  {...outline}
                  activeId={lesson.id}
                  layoutId="training-outline-sheet"
                  glide
                  onNavigate={() => setSheetOpen(false)}
                />
              </SheetContent>
            </Sheet>
            {nextButton("flex-1")}
          </div>
        </div>
      </article>
    </ViewTransition>
  );
}
