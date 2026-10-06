"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { TriangleAlert } from "lucide-react";
import { reportSave, type SaveLabels } from "@/components/action-feedback";
import { clockMinutes, lanes, type Span } from "@/lib/calendar";
import {
  CLOCK_STEP_MINUTES,
  DEFAULT_SLOT_MINUTES,
  minutesToClock,
} from "@/lib/clock";
import { formatTime, formatTimeRange, type Locale } from "@/lib/format";
import { hrefWith } from "@/lib/search-params";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";
import { rescheduleRideAction } from "../actions";
import { RIDE_MAX_MINUTES } from "../schemas";
import {
  clamp,
  instantOn,
  minuteAt,
  segmentsOf,
  snap,
  snapDown,
  type Band,
  type WeekDay,
} from "./ride-week-geometry";

export type WeekRide = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  cancelled: boolean;
  tone: string;
  where: string;
  detail: string;
  grounded: string | null;
  href: string;
  movable: boolean;
};

export type RideWeekStrings = {
  open: string;
  cancelled: string;
  grounded: string;
  resize: string;
  save: SaveLabels;
};

type Props = {
  days: (WeekDay & { isToday: boolean })[];
  selectedDay: string;
  band: Band;
  hourRem: number;
  timeZone: string;
  locale: Locale;
  now: Date;
  rides: WeekRide[];
  strings: RideWeekStrings;
};

type Preview = {
  kind: "create" | "move" | "resize";
  rideId: string | null;
  day: number;
  from: number;
  to: number;
};

type Drag = Preview & {
  pointerId: number;
  x: number;
  y: number;
  touch: boolean;
  active: boolean;
  anchor: number;
  offset: number;
  originDay: number;
  originFrom: number;
  originTo: number;
};

const LONG_PRESS_MS = 300;
const MOUSE_SLOP = 4;
const TOUCH_SLOP = 8;
const MINUTE_MS = 60_000;

export function RideWeekColumns({
  days,
  selectedDay,
  band,
  hourRem,
  timeZone,
  locale,
  now: initialNow,
  rides,
  strings,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const creating = useSearchParams().get("new") === "1";
  const [, startTransition] = useTransition();
  const [shown, applyMove] = useOptimistic(
    rides,
    (state, next: Span & { id: string }) =>
      state.map((ride) =>
        ride.id === next.id
          ? { ...ride, startsAt: next.startsAt, endsAt: next.endsAt }
          : ride,
      ),
  );
  const [preview, setPreview] = useState<Preview | null>(null);
  const [ghost, setGhost] = useState<Preview | null>(null);
  const [now, setNow] = useState(initialNow);
  const columns = useRef<(HTMLDivElement | null)[]>([]);
  const drag = useRef<Drag | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClick = useRef(false);
  const detach = useRef<(() => void) | null>(null);

  if (ghost && !creating && !preview) setGhost(null);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), MINUTE_MS);
    const blockScroll = (event: TouchEvent) => {
      if (drag.current?.active) event.preventDefault();
    };
    document.addEventListener("touchmove", blockScroll, { passive: false });
    return () => {
      clearInterval(tick);
      document.removeEventListener("touchmove", blockScroll);
      detach.current?.();
    };
  }, []);

  const bandStart = band.from * 60;
  const bandEnd = band.to * 60;
  const bandMinutes = bandEnd - bandStart;

  const rectOf = (day: number) =>
    columns.current[day]?.getBoundingClientRect() ?? null;

  const dayAt = (clientX: number, fallback: number) => {
    const index = columns.current.findIndex((column) => {
      if (!column) return false;
      const rect = column.getBoundingClientRect();
      return rect.width > 0 && clientX >= rect.left && clientX < rect.right;
    });
    return index === -1 ? fallback : index;
  };

  const minuteOf = (day: number, clientY: number) => {
    const rect = rectOf(day);
    return rect ? minuteAt(clientY, rect, band) : bandStart;
  };

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    detach.current?.();
    detach.current = null;
    drag.current = null;
  };

  const show = (next: Preview) => {
    const current = drag.current;
    if (current) {
      current.day = next.day;
      current.from = next.from;
      current.to = next.to;
    }
    setPreview((current) => {
      if (
        current &&
        current.day === next.day &&
        current.from === next.from &&
        current.to === next.to
      )
        return current;
      if (current && drag.current?.touch) haptics.selectionChanged();
      return next;
    });
  };

  const follow = (clientX: number, clientY: number) => {
    const current = drag.current;
    if (!current) return;
    const minute = minuteOf(current.day, clientY);
    if (current.kind === "create") {
      const at = snap(minute);
      const from = at > current.anchor ? current.anchor : at;
      const to =
        at > current.anchor
          ? Math.max(at, current.anchor + CLOCK_STEP_MINUTES)
          : current.anchor + CLOCK_STEP_MINUTES;
      show({
        ...current,
        from: clamp(from, bandStart, bandEnd - CLOCK_STEP_MINUTES),
        to: clamp(to, bandStart + CLOCK_STEP_MINUTES, bandEnd),
      });
      return;
    }
    if (current.kind === "move") {
      const day = dayAt(clientX, current.day);
      const length = current.originTo - current.originFrom;
      const from = clamp(
        snap(minuteOf(day, clientY) - current.offset),
        bandStart,
        Math.max(bandStart, bandEnd - length),
      );
      show({ ...current, day, from, to: from + length });
      return;
    }
    const to = clamp(
      snap(minute),
      current.from + CLOCK_STEP_MINUTES,
      Math.min(current.from + RIDE_MAX_MINUTES, bandEnd),
    );
    show({ ...current, to });
  };

  const activate = () => {
    const current = drag.current;
    if (!current) return;
    current.active = true;
    if (current.touch) haptics.selectionStart();
    setPreview({
      kind: current.kind,
      rideId: current.rideId,
      day: current.day,
      from: current.from,
      to: current.to,
    });
  };

  const openDrawer = (day: number, from: number, to: number) => {
    const target = days[day];
    if (!target) return;
    setGhost({ kind: "create", rideId: null, day, from, to });
    router.replace(
      hrefWith(pathname, window.location.search, {
        new: "1",
        date: target.key,
        start: minutesToClock(from),
        end: minutesToClock(to),
      }),
      { scroll: false },
    );
  };

  const reschedule = (
    ride: WeekRide,
    next: Span,
    previous: Span,
    undoing = false,
  ) => {
    startTransition(async () => {
      applyMove({ id: ride.id, ...next });
      const result = await rescheduleRideAction(ride.id, {
        startsAt: next.startsAt.toISOString(),
        endsAt: next.endsAt.toISOString(),
      });
      reportSave(result, {
        report: () => {},
        labels: strings.save,
        undoing,
        undo: undoing
          ? undefined
          : () => reschedule(ride, previous, next, true),
      });
    });
  };

  const finish = () => {
    const current = drag.current;
    if (!current) return;
    const { kind, active, touch, day, anchor, from, to } = current;
    stop();
    setPreview(null);
    if (active && touch) haptics.selectionEnd();

    if (kind === "create") {
      if (!active && touch) return;
      if (active && (from !== anchor || to - from > CLOCK_STEP_MINUTES)) {
        openDrawer(day, from, to);
        return;
      }
      const start = clamp(anchor, bandStart, bandEnd - CLOCK_STEP_MINUTES);
      openDrawer(day, start, Math.min(start + DEFAULT_SLOT_MINUTES, bandEnd));
      return;
    }

    if (!active) return;
    suppressClick.current = true;
    setTimeout(() => (suppressClick.current = false), 0);
    const ride = shown.find((candidate) => candidate.id === current.rideId);
    if (!ride) return;
    if (
      day === current.originDay &&
      from === current.originFrom &&
      to === current.originTo
    )
      return;
    reschedule(
      ride,
      {
        startsAt: instantOn(days[day], from, timeZone),
        endsAt: instantOn(days[day], to, timeZone),
      },
      { startsAt: ride.startsAt, endsAt: ride.endsAt },
    );
  };

  const begin = (
    event: ReactPointerEvent,
    init: Omit<Drag, "x" | "y" | "touch" | "active" | "pointerId">,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (drag.current) return;
    const touch = event.pointerType !== "mouse";
    drag.current = {
      ...init,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      touch,
      active: false,
    };
    if (touch) timer.current = setTimeout(activate, LONG_PRESS_MS);

    const onMove = (move: PointerEvent) => {
      const current = drag.current;
      if (!current || move.pointerId !== current.pointerId) return;
      if (!current.active) {
        const distance = Math.hypot(
          move.clientX - current.x,
          move.clientY - current.y,
        );
        if (current.touch) {
          if (distance > TOUCH_SLOP) stop();
          return;
        }
        if (distance < MOUSE_SLOP) return;
        activate();
      }
      follow(move.clientX, move.clientY);
    };
    const onUp = (up: PointerEvent) => {
      if (up.pointerId === drag.current?.pointerId) finish();
    };
    const onCancel = (cancel: PointerEvent) => {
      if (cancel.pointerId !== drag.current?.pointerId) return;
      stop();
      setPreview(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    detach.current = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  };

  const startCreate = (event: ReactPointerEvent, day: number) => {
    if ((event.target as HTMLElement).closest("[data-ride]")) return;
    const anchor = snapDown(minuteOf(day, event.clientY));
    begin(event, {
      kind: "create",
      rideId: null,
      day,
      from: anchor,
      to: anchor + CLOCK_STEP_MINUTES,
      anchor,
      offset: 0,
      originDay: day,
      originFrom: anchor,
      originTo: anchor + CLOCK_STEP_MINUTES,
    });
  };

  const startRide = (
    event: ReactPointerEvent,
    day: number,
    ride: WeekRide,
    from: number,
    to: number,
    kind: "move" | "resize",
  ) => {
    if (!ride.movable) return;
    event.stopPropagation();
    begin(event, {
      kind,
      rideId: ride.id,
      day,
      from,
      to,
      anchor: from,
      offset: minuteOf(day, event.clientY) - from,
      originDay: day,
      originFrom: from,
      originTo: to,
    });
  };

  const placed = shown.map((ride) => {
    if (!preview || preview.rideId !== ride.id || preview.kind === "create")
      return ride;
    const day = days[preview.day];
    return {
      ...ride,
      startsAt: instantOn(day, preview.from, timeZone),
      endsAt: instantOn(day, preview.to, timeZone),
    };
  });

  const createBlock =
    preview?.kind === "create" ? preview : creating ? ghost : null;

  const span = (day: WeekDay, from: number, to: number) =>
    formatTimeRange(
      instantOn(day, from, timeZone),
      instantOn(day, to, timeZone),
      locale,
      timeZone,
    );

  return (
    <>
      {days.map((day, index) => {
        const touching = segmentsOf(placed, day, timeZone);
        const packed = lanes(touching.map(({ item }) => item));
        const nowMinute = day.isToday ? clockMinutes(now, timeZone) : null;

        return (
          <div
            key={day.key}
            ref={(node) => {
              columns.current[index] = node;
            }}
            onPointerDown={(event) => startCreate(event, index)}
            onContextMenu={(event) => {
              if (drag.current) event.preventDefault();
            }}
            className={cn(
              "border-line relative touch-pan-y border-r select-none [-webkit-touch-callout:none]",
              day.key !== selectedDay && "max-md:hidden",
            )}
            style={{ height: `${(band.to - band.from) * hourRem}rem` }}
          >
            {Array.from({ length: band.to - band.from }, (_, i) => (
              <div
                key={i}
                style={{ height: `${hourRem}rem` }}
                className="border-line pointer-events-none border-b"
              />
            ))}

            {touching.map(({ item: ride, segment }, slot) => {
              const top = ((segment.from - bandStart) / bandMinutes) * 100;
              const height = ((segment.to - segment.from) / bandMinutes) * 100;
              const clampedTop = Math.max(0, top);
              const { lane, lanes: width } = packed[slot];
              const dragging = preview?.rideId === ride.id;
              const past = ride.endsAt.getTime() <= now.getTime();
              const time = dragging
                ? span(day, segment.from, segment.to)
                : formatTime(ride.startsAt, locale, timeZone);
              const whole =
                ride.startsAt >= day.start && ride.endsAt <= day.end;
              const movable = ride.movable && whole && !past;

              return (
                <article
                  key={ride.id}
                  data-ride
                  title={ride.cancelled ? strings.cancelled : undefined}
                  onPointerDown={(event) =>
                    movable
                      ? startRide(
                          event,
                          index,
                          ride,
                          segment.from,
                          segment.to,
                          "move",
                        )
                      : undefined
                  }
                  onClickCapture={(event) => {
                    if (!suppressClick.current) return;
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  style={{
                    top: `${clampedTop}%`,
                    height: `${Math.min(Math.max(height, 4), 100 - clampedTop)}%`,
                    left: dragging ? 0 : `${(lane / width) * 100}%`,
                    width: dragging ? "100%" : `${100 / width}%`,
                  }}
                  className={cn(
                    "absolute flex flex-col overflow-hidden rounded-md border border-l-2 p-1 text-xs @3xl:border-l-4 @3xl:px-2 @3xl:py-1.25 max-md:border-l-4 max-md:px-2 max-md:py-1.25",
                    ride.tone,
                    "has-[a:focus-visible]:ring-ring/50 has-[a:hover]:shadow-lift transition-[box-shadow,opacity] has-[a:focus-visible]:ring-2 motion-reduce:transition-none",
                    past && !dragging && "opacity-60",
                    movable && "cursor-grab",
                    dragging &&
                      "shadow-lift ring-ink/10 z-20 cursor-grabbing ring-1",
                  )}
                >
                  <Link
                    href={ride.href}
                    draggable={false}
                    aria-label={`${ride.cancelled ? strings.cancelled : strings.open} · ${time} ${ride.where}`}
                    className="absolute inset-0 z-10 rounded-md outline-none"
                  />
                  {ride.grounded ? (
                    <p
                      title={ride.grounded}
                      className="bg-red-tint text-ink order-first mb-0.5 flex w-fit max-w-full items-center gap-1 rounded-full px-1 py-0.5 @3xl:px-1.25"
                    >
                      <TriangleAlert
                        aria-hidden
                        className="text-red-ink size-3 shrink-0"
                      />
                      <span
                        aria-hidden
                        className="hidden truncate @3xl:inline max-md:inline"
                      >
                        {strings.grounded}
                      </span>
                      <span className="sr-only">{ride.grounded}</span>
                    </p>
                  ) : null}
                  <p
                    className={cn(
                      "font-display order-2 tabular-nums @3xl:order-1 @3xl:truncate max-md:order-1 max-md:truncate",
                      ride.cancelled && "line-through",
                    )}
                  >
                    {time}
                  </p>
                  <p
                    className={cn(
                      "order-1 font-medium hyphens-auto wrap-break-word @3xl:order-2 @3xl:truncate @3xl:font-normal max-md:order-2 max-md:truncate max-md:font-normal",
                      ride.cancelled && "line-through @3xl:no-underline",
                    )}
                  >
                    {ride.where}
                  </p>
                  <p className="order-3 hidden truncate opacity-70 @3xl:block max-md:block">
                    {ride.detail}
                  </p>
                  {movable ? (
                    <span
                      aria-label={strings.resize}
                      onPointerDown={(event) =>
                        startRide(
                          event,
                          index,
                          ride,
                          segment.from,
                          segment.to,
                          "resize",
                        )
                      }
                      className="absolute inset-x-0 bottom-0 z-20 h-1.5 cursor-ns-resize"
                    />
                  ) : null}
                </article>
              );
            })}

            {createBlock && createBlock.day === index ? (
              <div
                aria-hidden
                style={{
                  top: `${((createBlock.from - bandStart) / bandMinutes) * 100}%`,
                  height: `${((createBlock.to - createBlock.from) / bandMinutes) * 100}%`,
                }}
                className="border-mint-deep bg-mint-tint/90 text-ink shadow-lift pointer-events-none absolute inset-x-0.5 z-30 overflow-hidden rounded-md border border-l-4 px-2 py-1 text-xs"
              >
                <p className="font-display tabular-nums">
                  {span(day, createBlock.from, createBlock.to)}
                </p>
              </div>
            ) : null}

            {nowMinute !== null &&
            nowMinute >= bandStart &&
            nowMinute <= bandEnd ? (
              <div
                aria-hidden
                style={{
                  top: `${((nowMinute - bandStart) / bandMinutes) * 100}%`,
                }}
                className="pointer-events-none absolute inset-x-0 z-20 -translate-y-1/2"
              >
                <div className="bg-red h-0.5 w-full" />
                <div className="bg-red absolute top-1/2 -left-1 size-2 -translate-y-1/2 rounded-full" />
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
