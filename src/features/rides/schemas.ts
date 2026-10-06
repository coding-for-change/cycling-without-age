import { z } from "zod";
import { clockMinutes, dayKey, instantAt } from "@/lib/calendar";
import { minutesToClock } from "@/lib/clock";
import { RIDE_CANCELLATION_REASONS } from "@/lib/ride-cancellation";
import { isValidTimeZone } from "@/lib/time-zone";

export { RIDE_CANCELLATION_REASONS };

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

/** A ride nobody can attend is a scheduling mistake, not a short ride. */
export const RIDE_MIN_MINUTES = 15;
export const RIDE_MAX_HOURS = 12;
export const RIDE_MAX_MINUTES = RIDE_MAX_HOURS * 60;
export const RIDE_MAX_PILOTS = 10;
/** How long riders may stay at a functional ride's destination before the return leg. */
export const RIDE_MAX_STAY_MINUTES = RIDE_MAX_MINUTES;
export const RIDE_NOTE_MAX = 2000;
export const RIDE_TITLE_MAX = 120;
export const RIDE_DESCRIPTION_MAX = 5000;
export const RIDE_MAX_CAPACITY = 100;
export const RIDE_MAX_PHOTOS = 6;
export const RIDE_LIST_PAGE_MAX = 100;
export const PLEASURE_LIMITS = {
  passengers: 2,
  trishaws: 1,
  pilots: 1,
} as const;
export const FUNCTIONAL_MAX_PASSENGERS = 2;

export type ModelLimits = {
  passengers: number | null;
  trishaws: number | null;
  pilots: number | null;
};

export function modelLimits(
  model: RideModelName,
  capacity?: number | null,
  requiredPilots?: number | null,
): ModelLimits {
  if (model === "pleasure") return { ...PLEASURE_LIMITS };
  return {
    passengers:
      model === "functional" ? FUNCTIONAL_MAX_PASSENGERS : (capacity ?? null),
    trishaws: null,
    pilots: requiredPilots ?? null,
  };
}

export function shapedForModel<
  T extends {
    model: RideModelName;
    title?: string | null;
    description?: string | null;
    capacity?: number | null;
    destinationName?: string | null;
    destinationAddress?: string | null;
    destinationLatitude?: number | null;
    destinationLongitude?: number | null;
  },
>(ride: T): T {
  return {
    ...ride,
    ...(ride.model === "event"
      ? {}
      : { title: null, description: null, capacity: null }),
    ...(ride.model === "functional"
      ? {}
      : {
          destinationName: null,
          destinationAddress: null,
          destinationLatitude: null,
          destinationLongitude: null,
        }),
  } as T;
}

export const id = z.string().min(1).max(64);
const uniqueIds = (max: number) =>
  z
    .array(id)
    .max(max)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "duplicateId",
    });

export const trishawIdList = uniqueIds(20);

const placeName = z.string().trim().max(160).nullable().optional();
const placeAddress = z.string().trim().max(240).nullable().optional();
const latitude = z.number().min(-90).max(90).nullable().optional();
const longitude = z.number().min(-180).max(180).nullable().optional();
const rideNote = z.string().trim().max(RIDE_NOTE_MAX).nullable().optional();
const requiredPilots = z.number().int().min(1).max(RIDE_MAX_PILOTS);
const rideTitle = z.string().trim().max(RIDE_TITLE_MAX).nullable().optional();
const rideDescription = z
  .string()
  .trim()
  .max(RIDE_DESCRIPTION_MAX)
  .nullable()
  .optional();
const seats = z.number().int().min(1).max(RIDE_MAX_CAPACITY);
const capacity = seats.nullable().optional();

export const parseCapacity = (raw: string, min = 1) => {
  const parsed = seats
    .min(min)
    .safeParse(/^\d+$/.test(raw.trim()) ? Number(raw) : Number.NaN);
  return parsed.success ? parsed.data : null;
};

const eventFields = {
  title: rideTitle,
  description: rideDescription,
  capacity,
  photoFileIds: uniqueIds(RIDE_MAX_PHOTOS).default([]),
  passengerIds: uniqueIds(RIDE_MAX_CAPACITY).default([]),
  pilotIds: uniqueIds(RIDE_MAX_PILOTS).default([]),
};

export type RideModelShape = {
  model: RideModelName;
  title?: string | null;
  capacity?: number | null;
  requiredPilots: number;
  destinationName?: string | null;
  destinationAddress?: string | null;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
  passengers: number;
  trishaws: number;
  pilots: number;
  photos: number;
};

export type RideModelIssue = {
  code:
    | "titleRequired"
    | "capacityRequired"
    | "photosEventOnly"
    | "destinationRequired"
    | "pleasureLimit"
    | "capacityBelowRoster"
    | "tooManyPilots";
  path:
    | "title"
    | "capacity"
    | "photoFileIds"
    | "destinationName"
    | "passengerIds"
    | "trishawIds"
    | "requiredPilots"
    | "pilotIds";
};

export function rideModelIssues(ride: RideModelShape): RideModelIssue[] {
  const issues: RideModelIssue[] = [];
  const issue = (code: RideModelIssue["code"], path: RideModelIssue["path"]) =>
    issues.push({ code, path });
  const limits = modelLimits(ride.model, ride.capacity, ride.requiredPilots);
  const pleasure = ride.model === "pleasure";

  if (ride.model === "event") {
    if (!ride.title?.trim()) issue("titleRequired", "title");
    if (ride.capacity == null) issue("capacityRequired", "capacity");
  } else if (ride.photos) issue("photosEventOnly", "photoFileIds");

  if (ride.model === "functional") {
    const hasDestination =
      Boolean(
        ride.destinationName?.trim() || ride.destinationAddress?.trim(),
      ) ||
      (ride.destinationLatitude != null && ride.destinationLongitude != null);
    if (!hasDestination) issue("destinationRequired", "destinationName");
  }

  if (limits.passengers !== null && ride.passengers > limits.passengers)
    issue(pleasure ? "pleasureLimit" : "capacityBelowRoster", "passengerIds");
  if (limits.trishaws !== null && ride.trishaws > limits.trishaws)
    issue("pleasureLimit", "trishawIds");
  if (pleasure && ride.requiredPilots !== PLEASURE_LIMITS.pilots)
    issue("pleasureLimit", "requiredPilots");
  if (limits.pilots !== null && ride.pilots > limits.pilots)
    issue(pleasure ? "pleasureLimit" : "tooManyPilots", "pilotIds");
  return issues;
}

const checkModel = (
  ride: Omit<
    RideModelShape,
    "passengers" | "trishaws" | "pilots" | "photos"
  > & {
    trishawIds: string[];
    photoFileIds: string[];
    passengerIds: string[];
    pilotIds: string[];
  },
  ctx: z.RefinementCtx,
) => {
  for (const { code, path } of rideModelIssues({
    ...ride,
    passengers: ride.passengerIds.length,
    trishaws: ride.trishawIds.length,
    pilots: ride.pilotIds.length,
    photos: ride.photoFileIds.length,
  }))
    ctx.addIssue({ code: "custom", message: code, path: [path] });
};

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
  else if (minutesOf(window) > RIDE_MAX_MINUTES)
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
    chapterId: id,
    model: z.enum(RIDE_MODELS).default("event"),
    ...window,
    // A request may be for "a single trishaw or multiple trishaws" (lifecycle
    // 1C), and a Multiple Ride Event can run several at once.
    trishawIds: trishawIdList.default([]),
    ...place,
    requiredPilots: requiredPilots.default(1),
    note: rideNote,
    ...eventFields,
    /**
     * A functional ride there and back is two rides (story 17): the way back
     * is its own row, linked by `returnLegOfId`, with its own window, pilots
     * and roster.
     */
    returnLeg: rideTimes.optional(),
  })
  .superRefine(checkWindow)
  .superRefine(checkModel)
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
export type RideData = z.output<typeof rideInput>;

/** Everything about a ride that is not its window, its trishaws or its people. */
export const rideDetailsPatch = z
  .object({
    model: z.enum(RIDE_MODELS),
    ...place,
    requiredPilots,
    note: rideNote,
    title: rideTitle,
    description: rideDescription,
    capacity,
  })
  .partial();
export type RideDetailsPatch = z.input<typeof rideDetailsPatch>;

export const cancelRideInput = z.object({
  reasonCode: z.enum(RIDE_CANCELLATION_REASONS),
  note: rideNote,
  /** A cancelled outbound leg usually takes the way back with it. */
  includeReturnLeg: z.boolean().default(true),
});
export type CancelRideInput = z.input<typeof cancelRideInput>;

export const rideLogNote = z.string().trim().min(1).max(RIDE_NOTE_MAX);

export const rideRef = z.object({ rideId: id });
export const pilotInput = rideRef.extend({ userId: id });
export const riderInput = rideRef.extend({ passengerId: id });
export const noteInput = rideRef.extend({ text: rideLogNote });
export const rideTrishawsInput = rideRef.extend({ trishawIds: trishawIdList });

export const bookRiderInput = z.object({
  rideId: id,
  passengerId: id,
  position: z.number().int().min(0).max(RIDE_MAX_CAPACITY).optional(),
});
export type BookRiderInput = z.input<typeof bookRiderInput>;

export const reorderRosterInput = z.object({
  rideId: id,
  passengerIds: uniqueIds(RIDE_MAX_CAPACITY).min(1),
});
export type ReorderRosterInput = z.input<typeof reorderRosterInput>;

export const ridePhotosInput = z.object({
  rideId: id,
  fileIds: uniqueIds(RIDE_MAX_PHOTOS),
});
export type RidePhotosInput = z.input<typeof ridePhotosInput>;

export const rideListPageInput = z.object({
  chapterIds: uniqueIds(500),
  cursor: z.string().max(200).nullable().optional(),
  limit: z.number().int().min(1).max(RIDE_LIST_PAGE_MAX).default(30),
});
export type RideListPageInput = z.input<typeof rideListPageInput>;

const coords = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const routeEstimateInput = z.object({ from: coords, to: coords });
export type RouteEstimateInput = z.input<typeof routeEstimateInput>;

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
  .max(RIDE_MAX_MINUTES);

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

export const rescheduleInput = z.union([wallSlot, rideTimes]);
export type RescheduleInput = z.input<typeof rescheduleInput>;

const slotQuery = {
  chapterId: id,
  slot: wallSlot,
  roundTrip: z.boolean().default(false),
  stayMinutes: z.number().int().min(0).max(RIDE_MAX_STAY_MINUTES).default(60),
};

export const scheduleRideForm = z
  .object({
    ...slotQuery,
    model: z.enum(RIDE_MODELS),
    ...place,
    trishawIds: trishawIdList.default([]),
    requiredPilots: requiredPilots.default(1),
    note: rideNote,
    ...eventFields,
  })
  .superRefine(checkModel);
export type ScheduleRideForm = z.input<typeof scheduleRideForm>;
export type ScheduleRideData = z.output<typeof scheduleRideForm>;

export const trishawWindowQuery = z.object(slotQuery);
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
  return {
    date: dayKey(ride.startsAt, timeZone),
    start: minutesToClock(clockMinutes(ride.startsAt, timeZone)),
    durationMinutes: Math.round(
      (ride.endsAt.getTime() - ride.startsAt.getTime()) / 60_000,
    ),
  };
}
