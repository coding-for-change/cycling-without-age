import { z } from "zod";

export const rideDraft = z.object({
  chapterSlug: z.string().max(60),
  when: z.enum(["morning", "afternoon", "any"]),
});

export type RideDraft = z.infer<typeof rideDraft>;
export type RideWhen = RideDraft["when"];
