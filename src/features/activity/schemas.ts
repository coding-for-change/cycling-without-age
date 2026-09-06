import { z } from "zod";

export const activityType = z.enum([
  "applicationSubmitted",
  "applicationApproved",
  "applicationRejected",
  "roleGranted",
  "roleRevoked",
  "memberRemoved",
  "emailSent",
  "countryAdminAppointed",
  "countryAdminRemoved",
  "accountCreated",
  "invited",
  "accountClaimed",
  "chapterCreated",
  "chapterUpdated",
  "chapterDeleted",
]);
export type ActivityType = z.infer<typeof activityType>;

export const recordEventInput = z.object({
  userId: z.string().min(1),
  type: activityType,
  actorUserId: z.string().min(1).optional(),
  chapterId: z.string().min(1).optional(),
  payload: z.record(z.string(), z.string().max(500)).optional(),
});
export type RecordEventInput = z.infer<typeof recordEventInput>;
