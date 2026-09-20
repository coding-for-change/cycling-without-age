import { z } from "zod";
import { chapters } from "@/features/chapters";
import { fill } from "@/lib/utils";
import { defineKind } from "./types";

export const pilotApplicationDecided = defineKind({
  event: "pilotApplication.decided",
  category: "application",
  policy: { push: true, email: "always", optional: false },
  payload: z.object({
    chapterName: z.string().nullable(),
    approved: z.boolean(),
    note: z.string().nullable(),
  }),
  recipients: async (event) => [event.userId],
  params: async (event) => ({
    chapterName: (await chapters.getChapter(event.chapterId))?.name ?? null,
    approved: event.approved,
    note: event.note,
  }),
  href: () => "/pilot",
  message: ({ chapterName, approved, note }, strings) => {
    const copy = approved
      ? strings.applicationApproved
      : strings.applicationRejected;
    const chapter = chapterName ?? "Cycling Without Age";
    return {
      subject: fill(copy.subject, { chapter }),
      preview: copy.preview,
      heading: copy.heading,
      body: fill(copy.intro, { chapter }),
      note: note ? { heading: copy.noteHeading, text: note } : null,
      cta: copy.cta,
      footer: copy.footer,
      template: approved ? "approval" : "rejection",
    };
  },
});
