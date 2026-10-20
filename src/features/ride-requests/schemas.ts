import { z } from "zod";
import { MINUTES_IN_DAY } from "@/lib/calendar";
import {
  FUNCTIONAL_MAX_PASSENGERS,
  PLEASURE_LIMITS,
  RIDE_MAX_MINUTES,
  RIDE_MIN_MINUTES,
} from "@/features/rides/schemas";

export const RIDE_REQUEST_STATUSES = [
  "pending",
  "scheduled",
  "declined",
  "withdrawn",
] as const;
export type RideRequestStatus = (typeof RIDE_REQUEST_STATUSES)[number];

/** A rider asks for a ride out or to get somewhere; events are booked by seat. */
export const REQUEST_MODELS = ["pleasure", "functional"] as const;
export type RequestModel = (typeof REQUEST_MODELS)[number];

export const REQUEST_LIMITS = {
  riders: Math.min(PLEASURE_LIMITS.passengers, FUNCTIONAL_MAX_PASSENGERS),
  note: 1_000,
  decisionNote: 1_000,
  placeName: 160,
  placeAddress: 240,
} as const;

export const id = z.string().min(1).max(64);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable()
    .default(null);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((date) => {
    const [year, month, day] = date.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
  });

const dayMinute = z.number().int().min(0).max(MINUTES_IN_DAY);

export const placeInput = z.object({
  name: z.string().trim().min(1).max(REQUEST_LIMITS.placeName),
  address: z
    .string()
    .trim()
    .max(REQUEST_LIMITS.placeAddress)
    .transform((value) => value || null)
    .nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
});
export type PlaceInput = z.infer<typeof placeInput>;

/**
 * The window travels as the chapter's wall clock — a date and two minutes of
 * the day — because only the server knows the chapter's zone for sure.
 */
export const requestWindow = z
  .object({
    date: isoDate,
    startMinute: dayMinute,
    endMinute: dayMinute,
  })
  .refine(
    (window) =>
      window.endMinute - window.startMinute >= RIDE_MIN_MINUTES &&
      window.endMinute - window.startMinute <= RIDE_MAX_MINUTES,
    { message: "invalidWindow", path: ["endMinute"] },
  );
export type RequestWindow = z.infer<typeof requestWindow>;

const uniqueIds = z
  .array(id)
  .min(1)
  .max(REQUEST_LIMITS.riders)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "duplicateId",
  });

export const rideRequestInput = z
  .object({
    passengerIds: uniqueIds,
    model: z.enum(REQUEST_MODELS),
    rideLocationId: id.nullable().default(null),
    pickup: placeInput.nullable().default(null),
    destination: placeInput.nullable().default(null),
    roundTrip: z.boolean().default(true),
    window: requestWindow,
    note: optionalText(REQUEST_LIMITS.note),
  })
  .superRefine((request, ctx) => {
    if (!request.rideLocationId && !request.pickup)
      ctx.addIssue({
        code: "custom",
        message: "pickupRequired",
        path: ["pickup"],
      });
    if (request.model === "functional" && !request.destination)
      ctx.addIssue({
        code: "custom",
        message: "destinationRequired",
        path: ["destination"],
      });
  });
export type RideRequestInput = z.input<typeof rideRequestInput>;
export type RideRequestData = z.output<typeof rideRequestInput>;

/** What the facade stores, once the use case has resolved the chapter and the place. */
export const newRideRequest = z.object({
  chapterId: id,
  requesterUserId: id,
  model: z.enum(REQUEST_MODELS),
  passengerIds: uniqueIds,
  rideLocationId: id.nullable(),
  pickupName: z.string().max(REQUEST_LIMITS.placeName).nullable(),
  pickupAddress: z.string().max(REQUEST_LIMITS.placeAddress).nullable(),
  pickupLatitude: z.number().min(-90).max(90).nullable(),
  pickupLongitude: z.number().min(-180).max(180).nullable(),
  destinationName: z.string().max(REQUEST_LIMITS.placeName).nullable(),
  destinationAddress: z.string().max(REQUEST_LIMITS.placeAddress).nullable(),
  destinationLatitude: z.number().min(-90).max(90).nullable(),
  destinationLongitude: z.number().min(-180).max(180).nullable(),
  roundTrip: z.boolean(),
  requestedStartsAt: z.date(),
  requestedEndsAt: z.date(),
  note: z.string().max(REQUEST_LIMITS.note).nullable(),
});
export type NewRideRequest = z.infer<typeof newRideRequest>;

export const requestRef = z.object({ requestId: id });

export const decisionInput = requestRef.extend({
  note: optionalText(REQUEST_LIMITS.decisionNote),
});
export type DecisionInput = z.input<typeof decisionInput>;

export const requestListInput = z.object({
  status: z.enum(RIDE_REQUEST_STATUSES).nullable().default("pending"),
});
