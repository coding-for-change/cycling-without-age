import { z } from "zod";
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

/** A ride nobody can attend is a scheduling mistake, not a short ride. */
export const RIDE_MIN_MINUTES = 15;
export const RIDE_MAX_HOURS = 12;

export const trishawIdList = z
  .array(z.string().min(1).max(64))
  .max(20)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "duplicateTrishaw",
  });

export const rideInput = z
  .object({
    chapterId: z.string().min(1),
    model: z.enum(RIDE_MODELS).default("event"),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    // A request may be for "a single trishaw or multiple trishaws" (lifecycle
    // 1C), and a Multiple Ride Event can run several at once.
    trishawIds: trishawIdList.default([]),
    locationName: z.string().trim().max(160).nullable().optional(),
    locationAddress: z.string().trim().max(240).nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    // Functional rides go A → B. Event and pleasure rides end where they began,
    // so these stay null rather than repeating the origin.
    destinationName: z.string().trim().max(160).nullable().optional(),
    destinationAddress: z.string().trim().max(240).nullable().optional(),
    destinationLatitude: z.number().min(-90).max(90).nullable().optional(),
    destinationLongitude: z.number().min(-180).max(180).nullable().optional(),
  })
  .refine((r) => r.endsAt > r.startsAt, {
    message: "endsAfterStart",
    path: ["endsAt"],
  })
  .refine(
    (r) =>
      r.endsAt.getTime() - r.startsAt.getTime() >= RIDE_MIN_MINUTES * 60_000,
    { message: "tooShort", path: ["endsAt"] },
  )
  .refine(
    (r) =>
      r.endsAt.getTime() - r.startsAt.getTime() <= RIDE_MAX_HOURS * 60 * 60_000,
    { message: "tooLong", path: ["endsAt"] },
  );
export type RideInput = z.input<typeof rideInput>;

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
