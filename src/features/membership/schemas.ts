import { z } from "zod";
import { chapterRole } from "@/lib/access";

export { chapterRole, type ChapterRole } from "@/lib/access";

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
  note: z.string().trim().max(500).optional(),
});
export type ApplicationDecisionInput = z.infer<typeof applicationDecisionInput>;

export const inviteMemberInput = z.object({
  userId: z.string().min(1),
  chapterId: z.string().min(1),
  actorUserId: z.string().min(1),
  roles: z.array(chapterRole).min(1),
});
export type InviteMemberInput = z.infer<typeof inviteMemberInput>;
