import { z } from "zod";
import { birthDate, gender } from "@/features/profile/schemas";

export const passengerInput = z.object({
  chapterId: z.string().min(1).max(64),
  managedByUserId: z.string().min(1).max(64),
  userId: z.string().min(1).max(64).nullish(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  birthDate,
  gender,
});
export type PassengerInput = z.infer<typeof passengerInput>;

export const ownRiderDetailsPatch = z.object({
  birthDate: birthDate.optional(),
  gender: gender.optional(),
});
export type OwnRiderDetailsPatch = z.infer<typeof ownRiderDetailsPatch>;
export type OwnRiderDetailsPatchInput = z.input<typeof ownRiderDetailsPatch>;

export const RIDER_NOTE_MAX = 1_000;

export const riderNeedsInput = z
  .object({
    needsWheelchairBike: z.boolean(),
    note: z
      .string()
      .trim()
      .max(RIDER_NOTE_MAX)
      .transform((value) => value || null)
      .nullable(),
    rideLocationId: z.string().min(1).max(64).nullable(),
  })
  .partial();
export type RiderNeedsInput = z.input<typeof riderNeedsInput>;
export type RiderNeeds = z.output<typeof riderNeedsInput>;
