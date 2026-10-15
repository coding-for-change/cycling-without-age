import { z } from "zod";
import { birthDate, gender, homeInput } from "@/features/profile/schemas";

export const pickupInput = z.discriminatedUnion("residence", [
  z.object({ residence: z.literal("careHome") }),
  homeInput.extend({ residence: z.literal("home") }),
]);
export type PickupInput = z.infer<typeof pickupInput>;

export const passengerInput = z.object({
  chapterId: z.string().min(1).max(64),
  managedByUserId: z.string().min(1).max(64),
  userId: z.string().min(1).max(64).nullish(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  birthDate,
  gender,
  pickup: pickupInput.optional(),
});
export type PassengerInput = z.infer<typeof passengerInput>;

export const managedRiderInput = passengerInput.pick({
  firstName: true,
  lastName: true,
  birthDate: true,
  gender: true,
  pickup: true,
});
export type ManagedRiderInput = z.input<typeof managedRiderInput>;

export const MAX_MANAGED_RIDERS = 10;

export const managedRiderPatch = managedRiderInput.partial().strict();
export type ManagedRiderPatch = z.infer<typeof managedRiderPatch>;
export type ManagedRiderPatchInput = z.input<typeof managedRiderPatch>;

export const ownRiderDetailsPatch = z.object({
  birthDate: birthDate.optional(),
  gender: gender.optional(),
});
export type OwnRiderDetailsPatch = z.infer<typeof ownRiderDetailsPatch>;
export type OwnRiderDetailsPatchInput = z.input<typeof ownRiderDetailsPatch>;
