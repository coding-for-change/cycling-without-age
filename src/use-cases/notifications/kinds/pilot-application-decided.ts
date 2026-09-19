import { z } from "zod";
import { fill } from "@/lib/utils";
import { nameOfChapter } from "./lookups";
import { defineKind } from "./types";
import { ORG_NAME } from "@/lib/brand";
import { PERSPECTIVE_HOME } from "@/lib/redirects";

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
    chapterName: await nameOfChapter(event.chapterId),
    approved: event.approved,
    note: event.note,
  }),
  href: () => PERSPECTIVE_HOME.pilot,
  message: ({ chapterName, approved, note }, strings) => {
    const copy = approved
      ? strings.applicationApproved
      : strings.applicationRejected;
    const chapter = chapterName ?? ORG_NAME;
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
