import { z } from "zod";

export const gender = z.enum(["female", "male", "other"]);
export type Gender = z.infer<typeof gender>;

export const residence = z.enum(["careHome", "home"]);
export type Residence = z.infer<typeof residence>;

export const birthDate = z.coerce
  .date()
  .min(new Date("1900-01-01"))
  .max(new Date());

export const personalDetailsInput = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  birthDate,
  gender,
});
export type PersonalDetailsInput = z.infer<typeof personalDetailsInput>;

export const homeInput = z.object({
  address: z.string().trim().min(1).max(240),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type HomeInput = z.infer<typeof homeInput>;

export const consentInput = z.object({
  safety: z.boolean(),
  notifications: z.boolean(),
  data: z.boolean(),
});
export type ConsentInput = z.infer<typeof consentInput>;

const nonEmpty = (patch: Record<string, unknown>) =>
  Object.values(patch).some((value) => value !== undefined);

export const ownDetailsPatch = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    birthDate: birthDate.optional(),
    gender: gender.optional(),
  })
  .refine(nonEmpty);
export type OwnDetailsPatch = z.infer<typeof ownDetailsPatch>;
export type OwnDetailsPatchInput = z.input<typeof ownDetailsPatch>;

export const notificationPreferences = z
  .object({
    push: z.boolean().optional(),
    email: z.boolean().optional(),
  })
  .refine(nonEmpty);
export type NotificationPreferences = z.infer<typeof notificationPreferences>;
