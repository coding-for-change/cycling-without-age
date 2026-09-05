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
