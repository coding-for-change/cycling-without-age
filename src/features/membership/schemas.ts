import { z } from "zod";

export const chapterRole = z.enum(["admin", "pilot", "passenger"]);
export type ChapterRole = z.infer<typeof chapterRole>;

/** One request applies to at most this many chapters; the screen stops the
 *  selection at the same number so the cap is never met as a generic failure. */
export const MAX_PILOT_CHAPTERS = 5;

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
