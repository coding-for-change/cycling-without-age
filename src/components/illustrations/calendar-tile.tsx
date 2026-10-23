"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { formatTime, type Locale } from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import { countdownOf, dayParts } from "./countdown";

export type CalendarTileLabels = {
  in: string;
  days: string;
  tomorrow: string;
  today: string;
};

type Face = { top: string; big: string; bottom: string };

const DAY_MS = 86_400_000;
const FLIPS = 2;

const SIZES = {
  sm: { box: "w-18 h-20", big: "text-3xl", compact: "text-sm", strip: "h-6" },
  md: { box: "w-22 h-25", big: "text-4xl", compact: "text-lg", strip: "h-7" },
} as const;

function faces({
  now,
  startsAt,
  timeZone,
  locale,
  words,
  labels,
  show,
}: {
  now: Date | string;
  startsAt: Date | string;
  timeZone: string;
  locale: Locale;
  words: Locale;
  labels: CalendarTileLabels;
  show: "countdown" | "date";
}): { final: Face; before: Face[] } {
  const start = new Date(startsAt);
  const dateFace = (instant: Date): Face => {
    const parts = dayParts(instant, timeZone, locale);
    return { top: parts.weekday, big: parts.day, bottom: parts.month };
  };
  const daysFace = (days: number): Face => ({
    top: labels.in,
    big: String(days),
    bottom: formatMessage(labels.days, { count: days }, words),
  });
  const previousDays = Array.from({ length: FLIPS }, (_, index) =>
    dateFace(new Date(start.getTime() - (FLIPS - index) * DAY_MS)),
  );

  const countdown = countdownOf(now, start, timeZone);
  if (show === "date" || countdown.kind === "past")
    return { final: dateFace(start), before: previousDays };

  if (countdown.kind === "days")
    return {
      final: daysFace(countdown.days),
      before: Array.from({ length: FLIPS }, (_, index) =>
        daysFace(countdown.days + FLIPS - index),
      ),
    };

  const parts = dayParts(start, timeZone, locale);
  if (countdown.kind === "tomorrow")
    return {
      final: { top: labels.tomorrow, big: parts.day, bottom: parts.month },
      before: previousDays,
    };

  return {
    final: {
      top: labels.today,
      big: formatTime(start, locale, timeZone),
      bottom: `${parts.weekday} ${parts.day} ${parts.month}`,
    },
    before: previousDays,
  };
}

function Page({ face, size }: { face: Face; size: keyof typeof SIZES }) {
  const scale = SIZES[size];
  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl bg-paper">
      <div
        className={cn(
          "flex shrink-0 items-end justify-center bg-mint px-1.25 pb-0.5 text-ink",
          scale.strip,
        )}
      >
        <span className="truncate text-xs leading-4 font-semibold tracking-wide uppercase">
          {face.top}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-1.25">
        <span
          className={cn(
            "font-display leading-none font-bold tracking-tight text-red-ink tabular-nums",
            face.big.length > 3 ? scale.compact : scale.big,
          )}
        >
          {face.big}
        </span>
        <span className="mt-1 truncate text-xs leading-4 font-medium tracking-wide text-ink-soft uppercase">
          {face.bottom}
        </span>
      </div>
    </div>
  );
}

export function CalendarTile({
  now,
  startsAt,
  timeZone,
  locale,
  words = locale,
  labels,
  show = "countdown",
  size = "md",
  className,
}: {
  now: Date | string;
  startsAt: Date | string;
  timeZone: string;
  locale: Locale;
  words?: Locale;
  labels: CalendarTileLabels;
  show?: "countdown" | "date";
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const { final, before } = faces({
    now,
    startsAt,
    timeZone,
    locale,
    words,
    labels,
    show,
  });

  return (
    <div
      ref={ref}
      role="img"
      aria-label={[final.top, final.big, final.bottom].join(" ")}
      className={cn("relative shrink-0", SIZES[size].box, className)}
    >
      <div
        aria-hidden
        className="absolute inset-0 translate-y-1 rounded-2xl bg-paper shadow-soft"
      />
      <div
        aria-hidden
        className="absolute inset-0 rounded-2xl shadow-lift perspective-normal"
      >
        <Page
          face={final}
          size={size}
        />
        {[...before].reverse().map((face, index) => (
          <motion.div
            key={`${index}-${face.big}`}
            className="absolute inset-0 origin-top backface-hidden motion-reduce:hidden"
            initial={{ rotateX: 0, opacity: 1 }}
            animate={inView ? { rotateX: 180, opacity: 0 } : undefined}
            transition={{
              rotateX: {
                delay: 0.25 + (before.length - 1 - index) * 0.32,
                duration: 0.55,
                ease: [0.45, 0, 0.2, 1],
              },
              opacity: {
                delay: 0.25 + (before.length - 1 - index) * 0.32 + 0.3,
                duration: 0.2,
              },
            }}
          >
            <Page
              face={face}
              size={size}
            />
          </motion.div>
        ))}
      </div>
      <div
        aria-hidden
        className="absolute inset-x-0 -top-1 flex justify-center gap-7"
      >
        <span className="h-3 w-1.5 rounded-full bg-mint-deep ring-2 ring-paper" />
        <span className="h-3 w-1.5 rounded-full bg-mint-deep ring-2 ring-paper" />
      </div>
    </div>
  );
}
