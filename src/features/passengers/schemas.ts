import { z } from "zod";
import { birthDate, gender } from "@/features/profile";

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

/** The rider row's copy of the two fields the account surface can edit. The
 *  name is left out on purpose: `User.name` is one string and the row keeps
 *  `firstName`/`lastName`, so splitting it back apart would be lossy. */
export const ownRiderDetailsPatch = z.object({
  birthDate: birthDate.optional(),
  gender: gender.optional(),
});
export type OwnRiderDetailsPatch = z.infer<typeof ownRiderDetailsPatch>;
export type OwnRiderDetailsPatchInput = z.input<typeof ownRiderDetailsPatch>;
