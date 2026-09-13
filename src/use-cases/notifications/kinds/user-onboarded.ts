import { z } from "zod";
import { chapters } from "@/features/chapters";
import { fill } from "@/lib/utils";
import { defineKind } from "./types";

export const userOnboarded = defineKind({
  event: "user.onboarded",
  category: "welcome",
  policy: { push: false, email: "always", optional: false },
  payload: z.object({
    chapterName: z.string().nullable(),
    role: z.enum(["pilot", "passenger"]),
  }),
  recipients: async (event) => [event.userId],
  params: async (event) => ({
    chapterName: event.chapterId
      ? ((await chapters.getChapter(event.chapterId))?.name ?? null)
      : null,
    role: event.role,
  }),
  href: (event) => (event.role === "pilot" ? "/pilot" : "/passenger"),
  message: ({ chapterName, role }, strings) => {
    const copy =
      role === "pilot" ? strings.welcomePilot : strings.welcomePassenger;
    const chapter = chapterName ?? "Cycling Without Age";
    return {
      subject: copy.subject,
      title: fill(copy.title, { chapter }),
      preview: copy.preview,
      heading: copy.heading,
      body: fill(copy.intro, { chapter }),
      steps: { heading: copy.howHeading, items: copy.how },
      cta: copy.cta,
      footer: copy.footer,
      template: "welcome",
    };
  },
});
