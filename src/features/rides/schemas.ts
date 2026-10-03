import { z } from "zod";
import { instantAt, wallClock } from "@/lib/calendar";
import { isValidTimeZone } from "@/lib/time-zone";

export const RIDE_MODELS = ["event", "pleasure", "functional"] as const;
export const RIDE_STATUSES = ["scheduled", "cancelled", "completed"] as const;
/**
 * Only `pilot` is modelled. CWA does staff rides with ambassadors and
 * transporters (`references/02-glossary.md`), but nobody can *be* one here —
 * `ChapterRole` is admin/pilot/passenger — so carrying them as assignment roles
 * described a capability the app did not have. They come back when membership
 * can express them.
 */
export const RIDE_ROLES = ["pilot"] as const;

/** The Report 3 buckets. The free-text note beside one says what happened. */
export const RIDE_CANCELLATION_REASONS = [
  "weather",
  "rider",
  "facility",
  "volunteers",
  "equipment",
  "noRiders",
  "other",
] as const;

/** A ride nobody can attend is a scheduling mistake, not a short ride. */
export const RIDE_MIN_MINUTES = 15;
export const RIDE_MAX_HOURS = 12;
export const RIDE_MAX_PILOTS = 10;
/** How long riders may stay at a functional ride's destination before the return leg. */
export const RIDE_MAX_STAY_MINUTES = RIDE_MAX_HOURS * 60;
export const RIDE_NOTE_MAX = 2000;

export const trishawIdList = z
  .array(z.string().min(1).max(64))
  .max(20)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "duplicateTrishaw",
  });

const placeName = z.string().trim().max(160).nullable().optional();
const placeAddress = z.string().trim().max(240).nullable().optional();
const latitude = z.number().min(-90).max(90).nullable().optional();
const longitude = z.number().min(-180).max(180).nullable().optional();
const rideNote = z.string().trim().max(RIDE_NOTE_MAX).nullable().optional();
const requiredPilots = z.number().int().min(1).max(RIDE_MAX_PILOTS);

const place = {
  locationName: placeName,
  locationAddress: placeAddress,
  latitude,
  longitude,
  // Functional rides go A → B. Event and pleasure rides end where they began,
  // so these stay null rather than repeating the origin.
  destinationName: placeName,
  destinationAddress: placeAddress,
  destinationLatitude: latitude,
  destinationLongitude: longitude,
};

type Window = { startsAt: Date; endsAt: Date };

const minutesOf = (window: Window) =>
  (window.endsAt.getTime() - window.startsAt.getTime()) / 60_000;

/** One rule for every window a ride occupies, outbound or return. */
const checkWindow = (window: Window, ctx: z.RefinementCtx) => {
  if (window.endsAt <= window.startsAt)
    ctx.addIssue({
      code: "custom",
      message: "endsAfterStart",
      path: ["endsAt"],
    });
  else if (minutesOf(window) < RIDE_MIN_MINUTES)
    ctx.addIssue({ code: "custom", message: "tooShort", path: ["endsAt"] });
  else if (minutesOf(window) > RIDE_MAX_HOURS * 60)
    ctx.addIssue({ code: "custom", message: "tooLong", path: ["endsAt"] });
};

const window = {
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
};

export const rideTimes = z.object(window).superRefine(checkWindow);
export type RideTimes = z.input<typeof rideTimes>;

export const rideInput = z
  .object({
    chapterId: z.string().min(1),
    model: z.enum(RIDE_MODELS).default("event"),
    ...window,
    // A request may be for "a single trishaw or multiple trishaws" (lifecycle
    // 1C), and a Multiple Ride Event can run several at once.
    trishawIds: trishawIdList.default([]),
    ...place,
    requiredPilots: requiredPilots.default(1),
    note: rideNote,
    /**
     * A functional ride there and back is two rides (story 17): the way back
     * is its own row, linked by `returnLegOfId`, with its own window, pilots
     * and roster.
     */
    returnLeg: z.object(window).superRefine(checkWindow).optional(),
  })
  .superRefine(checkWindow)
  .superRefine((ride, ctx) => {
    if (!ride.returnLeg) return;
    if (ride.model !== "functional")
      ctx.addIssue({
        code: "custom",
        message: "returnLegFunctionalOnly",
        path: ["returnLeg"],
      });
    if (ride.returnLeg.startsAt < ride.endsAt)
      ctx.addIssue({
        code: "custom",
        message: "returnBeforeArrival",
        path: ["returnLeg", "startsAt"],
      });
  });
export type RideInput = z.input<typeof rideInput>;

/** Everything about a ride that is not its window, its trishaws or its people. */
export const rideDetailsPatch = z
  .object({
    model: z.enum(RIDE_MODELS),
    ...place,
    requiredPilots,
    note: rideNote,
  })
  .partial();
export type RideDetailsPatch = z.input<typeof rideDetailsPatch>;

export const cancelRideInput = z.object({
  reasonCode: z.enum(RIDE_CANCELLATION_REASONS),
  note: z.string().trim().max(RIDE_NOTE_MAX).nullable().optional(),
  /** A cancelled outbound leg usually takes the way back with it. */
  includeReturnLeg: z.boolean().default(true),
});
export type CancelRideInput = z.input<typeof cancelRideInput>;

export const rideLogNote = z.string().trim().min(1).max(RIDE_NOTE_MAX);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((date) => {
    const [year, month, day] = date.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
  });
const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const durationMinutes = z
  .number()
  .int()
  .min(RIDE_MIN_MINUTES)
  .max(RIDE_MAX_HOURS * 60);

/**
 * What an admin types: a date and a start on the chapter's wall clock and a
 * length. Turning that into instants needs the chapter's time zone, which only
 * the server knows for sure.
 */
export const wallSlot = z.object({
  date: isoDate,
  start: clockTime,
  durationMinutes,
});
export type WallSlot = z.infer<typeof wallSlot>;

export const scheduleRideForm = z.object({
  chapterId: z.string().min(1).max(64),
  model: z.enum(RIDE_MODELS),
  slot: wallSlot,
  ...place,
  /** Functional only: the way back starts this long after the ride arrives. */
  roundTrip: z.boolean().default(false),
  stayMinutes: z.number().int().min(0).max(RIDE_MAX_STAY_MINUTES).default(60),
  trishawIds: trishawIdList.default([]),
  requiredPilots: requiredPilots.default(1),
  note: rideNote,
});
export type ScheduleRideForm = z.input<typeof scheduleRideForm>;

export const trishawWindowQuery = z.object({
  chapterId: z.string().min(1).max(64),
  slot: wallSlot,
  roundTrip: z.boolean().default(false),
  stayMinutes: z.number().int().min(0).max(RIDE_MAX_STAY_MINUTES).default(60),
});
export type TrishawWindowQuery = z.input<typeof trishawWindowQuery>;

/**
 * A half-open window `[from, to)`. Half-open is what makes a week grid and the
 * next week agree on midnight instead of both claiming it.
 */
export const rangeInput = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
    timeZone: z.string().refine(isValidTimeZone),
  })
  .refine((r) => r.to > r.from, { message: "endsAfterStart", path: ["to"] });
export type RangeInput = z.infer<typeof rangeInput>;

export type RideRole = (typeof RIDE_ROLES)[number];
export type RideModelName = (typeof RIDE_MODELS)[number];
export type RideStatusName = (typeof RIDE_STATUSES)[number];
export type RideCancellationReasonName =
  (typeof RIDE_CANCELLATION_REASONS)[number];

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The window a wall-clock slot occupies in the chapter's zone. The length is
 * real minutes, so a two-hour ride across a DST change still lasts two hours.
 */
export function slotWindow(slot: WallSlot, timeZone: string) {
  const [year, month, day] = slot.date.split("-").map(Number);
  const [hour, minute] = slot.start.split(":").map(Number);
  const startsAt = instantAt({ year, month, day, hour, minute }, timeZone);
  return {
    startsAt,
    endsAt: new Date(startsAt.getTime() + slot.durationMinutes * 60_000),
  };
}

/** The way back is as long as the way there and starts after the stay. */
export function returnWindow(
  outbound: { startsAt: Date; endsAt: Date },
  stayMinutes: number,
) {
  const startsAt = new Date(outbound.endsAt.getTime() + stayMinutes * 60_000);
  return {
    startsAt,
    endsAt: new Date(
      startsAt.getTime() +
        (outbound.endsAt.getTime() - outbound.startsAt.getTime()),
    ),
  };
}

export function slotOf(
  ride: { startsAt: Date; endsAt: Date },
  timeZone: string,
): WallSlot {
  const wall = wallClock(ride.startsAt, timeZone);
  return {
    date: `${wall.year}-${pad(wall.month)}-${pad(wall.day)}`,
    start: `${pad(wall.hour)}:${pad(wall.minute)}`,
    durationMinutes: Math.round(
      (ride.endsAt.getTime() - ride.startsAt.getTime()) / 60_000,
    ),
  };
}
