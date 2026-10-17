"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Check, FileText, Lock, PlayCircle, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveProgress } from "./live-progress";
import type { OutlineItem, OutlineStrings } from "./outline";

const GLIDE_MS = 280;

export function LessonOutline({
  items,
  activeId,
  strings,
  layoutId = "training-outline-active",
  onNavigate,
  glide = false,
  className,
}: {
  items: OutlineItem[];
  activeId: string | null;
  strings: OutlineStrings;
  layoutId?: string;
  onNavigate?: () => void;
  glide?: boolean;
  className?: string;
}) {
  const live = useLiveProgress();
  const router = useRouter();
  const reduced = useReducedMotion();
  const [picked, setPicked] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const shown = picked ?? activeId;
  const activeIndex = activeId
    ? items.findIndex((item) => item.id === activeId)
    : -1;
  const merged = unlockLive(
    items.map((item) => {
      const update = live?.lessons[item.id];
      return {
        ...item,
        ratio: Math.max(item.ratio, update?.ratio ?? 0),
        completed: item.completed || (update?.completed ?? false),
        fresh: update?.fresh ?? false,
      };
    }),
  );
  const firstOpen = merged.findIndex((item) => !item.completed);
  const direction = (index: number) =>
    activeIndex === -1 || index > activeIndex ? "push" : "pop";

  const navigate = (
    event: MouseEvent<HTMLAnchorElement>,
    id: string,
    href: string,
    type: "push" | "pop",
  ) => {
    if (!glide || id === activeId) return onNavigate?.();
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    setPicked(id);
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => {
        onNavigate?.();
        router.push(href, { transitionTypes: [type] });
      },
      reduced ? 0 : GLIDE_MS,
    );
  };

  return (
    <nav
      aria-label={strings.title}
      className={className}
    >
      <ol className="grid gap-1">
        {merged.map((item, index) => (
          <li key={item.id}>
            <OutlineRow
              item={item}
              number={index + 1}
              active={item.id === shown}
              current={item.id === activeId}
              upNext={item.id !== activeId && index === firstOpen}
              layoutId={layoutId}
              strings={strings}
              transition={direction(index)}
              onClick={(event) =>
                navigate(event, item.id, item.href, direction(index))
              }
            />
          </li>
        ))}
      </ol>
    </nav>
  );
}

type LiveItem = OutlineItem & { fresh: boolean };

function unlockLive(items: LiveItem[]): LiveItem[] {
  let quizOpen = false;
  let allBefore = true;
  return items.map((item) => {
    const locked =
      !item.completed && (quizOpen || (item.kind === "quiz" && !allBefore));
    if (item.kind === "quiz" && !item.completed) quizOpen = true;
    if (!item.completed) allBefore = false;
    return { ...item, locked: item.locked && locked };
  });
}

function OutlineRow({
  item,
  number,
  active,
  current,
  upNext,
  layoutId,
  strings,
  transition,
  onClick,
}: {
  item: LiveItem;
  number: number;
  active: boolean;
  current: boolean;
  upNext: boolean;
  layoutId: string;
  strings: OutlineStrings;
  transition: "push" | "pop";
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const quiz = item.kind === "quiz";
  const meta = item.locked
    ? quiz
      ? strings.lockedQuiz
      : strings.lockedLesson
    : quiz
      ? item.hint
      : item.hasVideo
        ? (item.duration ?? "")
        : strings.reading;
  const body = (
    <>
      {active ? (
        <motion.span
          layoutId={layoutId}
          transition={{ type: "spring", stiffness: 520, damping: 42 }}
          className="absolute inset-0 rounded-xl bg-mint-tint"
          aria-hidden
        />
      ) : null}
      <span
        className={cn(
          "relative grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums transition-colors duration-300 motion-reduce:transition-none",
          item.completed
            ? "bg-mint-deep text-white"
            : item.locked
              ? "bg-canvas-deep text-ink-faint"
              : quiz
                ? "bg-mint text-ink"
                : active
                  ? "bg-canvas text-ink ring-2 ring-mint-deep"
                  : "bg-canvas-deep text-ink-soft",
        )}
      >
        {item.completed ? (
          <Check
            className={cn("size-4", item.fresh && "animate-training-check")}
            strokeWidth={3}
            aria-label={strings.done}
          />
        ) : item.locked ? (
          <Lock
            className="size-3.5"
            aria-hidden
          />
        ) : quiz ? (
          <Trophy
            className="size-3.5"
            aria-hidden
          />
        ) : (
          number
        )}
      </span>
      <span className="relative grid min-w-0 flex-1 gap-1">
        <span
          className={cn(
            "truncate text-sm",
            active ? "font-semibold" : "font-medium",
            item.locked && "text-ink-soft",
          )}
        >
          {item.title}
        </span>
        <span className="flex min-w-0 items-center gap-1.25 text-xs text-ink-soft">
          {quiz || item.locked ? null : item.hasVideo ? (
            <PlayCircle
              className="size-3.5 shrink-0"
              aria-hidden
            />
          ) : (
            <FileText
              className="size-3.5 shrink-0"
              aria-hidden
            />
          )}
          <span className="truncate">{meta}</span>
          {upNext ? (
            <span className="ml-1 shrink-0 rounded-full bg-mint px-1.5 text-xs font-medium text-ink">
              {strings.upNext}
            </span>
          ) : null}
        </span>
        {item.hasVideo && !item.completed && item.ratio > 0 ? (
          <span className="h-1 overflow-hidden rounded-full bg-canvas-deeper">
            <span
              className="block h-full origin-left rounded-full bg-mint transition-transform duration-500 ease-out motion-reduce:transition-none"
              style={{ transform: `scaleX(${item.ratio})` }}
            />
          </span>
        ) : null}
      </span>
    </>
  );

  const shared =
    "group relative flex min-h-13 items-center gap-3 rounded-xl px-3 py-2.5";

  if (item.locked)
    return (
      <div
        aria-disabled
        className={shared}
      >
        {body}
      </div>
    );

  return (
    <Link
      href={item.href}
      prefetch
      transitionTypes={[transition]}
      aria-current={current ? "page" : undefined}
      onClick={onClick}
      className={cn(
        shared,
        "transition-colors hover:bg-canvas-deep motion-reduce:transition-none",
      )}
    >
      {body}
    </Link>
  );
}
