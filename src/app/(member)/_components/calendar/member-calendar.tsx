"use client";

import {
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type PointerEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatLongDateWithWeekday,
  formatMonthYearLong,
  formatWeekday,
  formatWeekdayDayMonthShort,
  formatWeekdayNarrow,
  type Locale,
} from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";
import {
  monthGrid,
  monthOf,
  selectDay,
  shiftMonth,
  type GridDay,
  type MarkerKind,
} from "./month-grid";

export type MemberCalendarStrings = {
  previous: string;
  next: string;
  today: string;
  nextUp: string;
  emptyDay: string;
  dayItems: string;
  book: string | null;
};

const SWIPE_MIN_PX = 48;

export function MemberCalendar({
  month,
  today,
  weekStartsOn,
  locale,
  words,
  markers,
  counts,
  agenda,
  next,
  strings,
  bookHref,
}: {
  month: string;
  today: string;
  weekStartsOn: number;
  locale: Locale;
  words: Locale;
  markers: Record<string, MarkerKind[]>;
  counts: Record<string, number>;
  agenda: Record<string, ReactNode>;
  next: string | null;
  strings: MemberCalendarStrings;
  bookHref: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [view, setView] = useOptimistic({
    month,
    day: selectDay({ requested: searchParams.get("day"), month, today }),
  });
  const [shown, setShown] = useState({ month: view.month, direction: 0 });
  if (shown.month !== view.month)
    setShown({
      month: view.month,
      direction: view.month > shown.month ? 1 : -1,
    });

  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const swiped = useRef(false);

  const hrefFor = (nextMonth: string, day: string) =>
    `${pathname}?${new URLSearchParams({ month: nextMonth, day }).toString()}`;

  const go = (day: string) => {
    const nextMonth = monthOf(day);
    if (nextMonth === month && !pending) {
      window.history.replaceState(null, "", hrefFor(nextMonth, day));
      return;
    }
    startTransition(() => {
      setView({ month: nextMonth, day });
      router.replace(hrefFor(nextMonth, day), { scroll: false });
    });
  };

  const goMonth = (delta: number) => {
    const target = shiftMonth(view.month, delta);
    go(monthOf(today) === target ? today : `${target}-01`);
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse") return;
    swiped.current = false;
    swipe.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
  };

  const onPointerUp = (event: PointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5)
      return;
    swiped.current = true;
    haptics.selectionChanged();
    goMonth(dx < 0 ? 1 : -1);
  };

  const weeks = monthGrid(view.month, weekStartsOn);
  const loaded = view.month === month;
  const items = loaded ? agenda[view.day] : null;
  const showNext = view.day === today && !counts[today] && next !== null;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center gap-1">
        <h1 className="min-w-0 flex-1 truncate text-2xl tracking-tight md:text-3xl">
          {formatMonthYearLong(`${view.month}-01`, locale)}
        </h1>
        {view.month !== monthOf(today) ? (
          <button
            type="button"
            onClick={() => go(today)}
            className="mr-1 min-h-9 rounded-full border border-line px-3 text-2sm font-medium outline-none hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ink"
          >
            {strings.today}
          </button>
        ) : null}
        <MonthButton
          label={strings.previous}
          onClick={() => goMonth(-1)}
        >
          <ChevronLeft
            aria-hidden
            className="size-5"
          />
        </MonthButton>
        <MonthButton
          label={strings.next}
          onClick={() => goMonth(1)}
        >
          <ChevronRight
            aria-hidden
            className="size-5"
          />
        </MonthButton>
      </header>

      <div
        className="touch-pan-y select-none"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          swipe.current = null;
        }}
        onClickCapture={(event) => {
          if (!swiped.current) return;
          swiped.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <div
          key={view.month}
          role="grid"
          aria-label={formatMonthYearLong(`${view.month}-01`, locale)}
          aria-busy={pending}
          className={cn(
            "flex flex-col gap-1",
            shown.direction !== 0 &&
              "duration-200 animate-in fade-in motion-reduce:animate-none",
            shown.direction > 0 && "slide-in-from-right-8",
            shown.direction < 0 && "slide-in-from-left-8",
          )}
        >
          <div
            role="row"
            className="grid grid-cols-7"
          >
            {weeks[0].map((day) => (
              <abbr
                key={day.key}
                role="columnheader"
                title={formatWeekday(day.key, locale)}
                className="py-1 text-center text-xs font-medium text-ink-soft no-underline"
              >
                {formatWeekdayNarrow(day.key, locale)}
              </abbr>
            ))}
          </div>
          {weeks.map((week) => (
            <div
              key={week[0].key}
              role="row"
              className="grid grid-cols-7"
            >
              {week.map((day) => (
                <DayCell
                  key={day.key}
                  day={day}
                  today={day.key === today}
                  selected={day.key === view.day}
                  markers={markers[day.key] ?? []}
                  label={[
                    formatLongDateWithWeekday(day.key, locale),
                    counts[day.key]
                      ? formatMessage(
                          strings.dayItems,
                          { count: counts[day.key] },
                          words,
                        )
                      : null,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                  onSelect={() => go(day.key)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <section
        aria-live="polite"
        className="flex flex-col gap-3 border-t border-line pt-5"
      >
        <h2 className="text-base">
          {formatLongDateWithWeekday(view.day, locale)}
        </h2>
        {!loaded ? (
          <AgendaSkeleton />
        ) : items ? (
          <ul className="flex flex-col gap-3">{items}</ul>
        ) : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-2sm text-ink-soft">
            <p>{strings.emptyDay}</p>
            {bookHref && strings.book ? (
              <Link
                href={bookHref}
                transitionTypes={["push"]}
                className="font-medium text-ink underline underline-offset-4 outline-none hover:text-ink-soft focus-visible:ring-2 focus-visible:ring-ink"
              >
                {strings.book}
              </Link>
            ) : null}
          </div>
        )}
        {showNext ? (
          <button
            type="button"
            onClick={() => go(next)}
            className="flex min-h-9 w-fit items-center gap-1.25 rounded-full bg-mint-tint px-3 text-2sm font-medium text-ink outline-none hover:bg-mint focus-visible:ring-2 focus-visible:ring-ink"
          >
            {formatMessage(
              strings.nextUp,
              { date: formatWeekdayDayMonthShort(next, locale) },
              words,
            )}
            <ArrowRight
              aria-hidden
              className="size-3.5"
            />
          </button>
        ) : null}
      </section>
    </div>
  );
}

function MonthButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-full text-ink outline-none hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ink"
    >
      {children}
    </button>
  );
}

function DayCell({
  day,
  today,
  selected,
  markers,
  label,
  onSelect,
}: {
  day: GridDay;
  today: boolean;
  selected: boolean;
  markers: MarkerKind[];
  label: string;
  onSelect: () => void;
}) {
  return (
    <div
      role="gridcell"
      aria-selected={selected}
      className="flex justify-center"
    >
      <button
        type="button"
        aria-label={label}
        aria-current={today ? "date" : undefined}
        onClick={onSelect}
        className="group flex h-13 w-full max-w-13 flex-col items-center gap-1 rounded-xl pt-1 outline-none focus-visible:ring-2 focus-visible:ring-ink"
      >
        <span
          className={cn(
            "grid size-8 place-items-center rounded-full text-sm tabular-nums transition-colors motion-reduce:transition-none",
            today
              ? "bg-mint-deep font-semibold text-white"
              : "group-hover:bg-canvas-deep",
            selected &&
              (today
                ? "ring-2 ring-mint-deep ring-offset-2 ring-offset-paper"
                : "font-semibold ring-2 ring-ink"),
            !day.inMonth && !today && "text-ink-faint",
          )}
        >
          {day.day}
        </span>
        <span
          aria-hidden
          className={cn(
            "flex h-1.5 items-center gap-1",
            !day.inMonth && "opacity-50",
          )}
        >
          {markers.map((kind, index) => (
            <span
              key={index}
              className={cn(
                "size-1.5 rounded-full",
                kind === "mine" && "bg-mint-deep",
                kind === "join" && "border border-mint-deep",
                kind === "pending" && "bg-mint",
              )}
            />
          ))}
        </span>
      </button>
    </div>
  );
}

function AgendaSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1].map((row) => (
        <div
          key={row}
          className="flex items-center gap-3.5 rounded-2xl border border-line p-3.5"
        >
          <Skeleton className="size-14 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
