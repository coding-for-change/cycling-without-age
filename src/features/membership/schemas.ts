import { z } from "zod";

export const chapterRole = z.enum(["admin", "pilot", "passenger"]);
export type ChapterRole = z.infer<typeof chapterRole>;

export const pilotApplicationInput = z.object({
  userId: z.string().min(1),
  chapterId: z.string().min(1),
  message: z.string().trim().max(1000).optional(),
});
export type PilotApplicationInput = z.infer<typeof pilotApplicationInput>;

export const applicationDecisionInput = z.object({
  applicationId: z.string().min(1),
  decidedByUserId: z.string().min(1),
  approve: z.boolean(),
});
export type ApplicationDecisionInput = z.infer<typeof applicationDecisionInput>;
