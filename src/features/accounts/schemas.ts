import { z } from "zod";
import { birthDate, gender } from "@/features/profile/schemas";

const email = z
  .string()
  .trim()
  .pipe(z.email().transform((value) => value.toLowerCase()));

const phone = z
  .string()
  .trim()
  .regex(/^\+\d{6,15}$/, "E.164");

export const contact = z.union([email, phone]);
export type Contact = z.infer<typeof contact>;

export const helperInput = z.object({
  name: z.string().trim().min(1).max(120),
  relationship: z.string().trim().min(1).max(80),
  contact,
});
export type HelperInput = z.infer<typeof helperInput>;

export const assistedPassengerInput = z.object({
  chapterId: z.string().min(1).max(64),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  birthDate,
  gender,
  contact,
  helper: helperInput.optional(),
});
export type AssistedPassengerInput = z.infer<typeof assistedPassengerInput>;

export const inviteInput = z.object({
  chapterId: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(120),
  email,
  role: z.enum(["admin", "pilot"]),
});
export type InviteInput = z.infer<typeof inviteInput>;
