import { z } from "zod";

export const RIDE_LOCATION_KINDS = [
  "careCenter",
  "residence",
  "publicPlace",
  "other",
] as const;
export type RideLocationKind = (typeof RIDE_LOCATION_KINDS)[number];

export const RIDE_LOCATION_LIMITS = {
  name: 160,
  address: 240,
  contactName: 120,
  contactPhone: 40,
  contactEmail: 254,
  notes: 5_000,
  typicalRideKm: 999.9,
  minutes: { min: 15, max: 12 * 60 },
} as const;

export const id = z.string().min(1).max(64);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable();

const fields = {
  kind: z.enum(RIDE_LOCATION_KINDS),
  name: z.string().trim().min(1).max(RIDE_LOCATION_LIMITS.name),
  address: optionalText(RIDE_LOCATION_LIMITS.address),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  contactName: optionalText(RIDE_LOCATION_LIMITS.contactName),
  contactPhone: optionalText(RIDE_LOCATION_LIMITS.contactPhone),
  contactEmail: z
    .string()
    .trim()
    .max(RIDE_LOCATION_LIMITS.contactEmail)
    .transform((value) => value.toLowerCase())
    .pipe(z.union([z.literal(""), z.email()]))
    .transform((value) => value || null)
    .nullable(),
  notes: optionalText(RIDE_LOCATION_LIMITS.notes),
  typicalRideKm: z
    .number()
    .min(0)
    .max(RIDE_LOCATION_LIMITS.typicalRideKm)
    .transform((km) => Math.round(km * 10) / 10)
    .nullable(),
  defaultMinutes: z
    .number()
    .int()
    .min(RIDE_LOCATION_LIMITS.minutes.min)
    .max(RIDE_LOCATION_LIMITS.minutes.max)
    .nullable(),
};

const pinned = <
  T extends { latitude?: number | null; longitude?: number | null },
>(
  value: T,
  ctx: z.RefinementCtx,
) => {
  if (value.latitude === undefined && value.longitude === undefined) return;
  if (
    ((value.latitude ?? null) === null) !==
    ((value.longitude ?? null) === null)
  )
    ctx.addIssue({ code: "custom", message: "coordsPair", path: ["latitude"] });
};

export const rideLocationInput = z
  .object({
    chapterId: id,
    kind: fields.kind.default("careCenter"),
    name: fields.name,
    address: fields.address.optional(),
    latitude: fields.latitude.optional(),
    longitude: fields.longitude.optional(),
    contactName: fields.contactName.optional(),
    contactPhone: fields.contactPhone.optional(),
    contactEmail: fields.contactEmail.optional(),
    notes: fields.notes.optional(),
    typicalRideKm: fields.typicalRideKm.optional(),
    defaultMinutes: fields.defaultMinutes.optional(),
  })
  .superRefine(pinned);
export type RideLocationInput = z.input<typeof rideLocationInput>;

export const rideLocationUpdateInput = z
  .object(fields)
  .partial()
  .superRefine(pinned);
export type RideLocationUpdateInput = z.input<typeof rideLocationUpdateInput>;
