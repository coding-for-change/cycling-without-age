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
    // Rows written before chapters could leave a note carry no key at all.
    welcomeNote: z.string().nullable().default(null),
  }),
  recipients: async (event) => [event.userId],
  params: async (event) => {
    if (!event.chapterId)
      return { chapterName: null, role: event.role, welcomeNote: null };
    const [chapter, settings] = await Promise.all([
      chapters.getChapter(event.chapterId),
      chapters.getSettings(event.chapterId),
    ]);
    return {
      chapterName: chapter?.name ?? null,
      role: event.role,
      welcomeNote: settings.welcomeNote,
    };
  },
  href: (event) => (event.role === "pilot" ? "/pilot" : "/passenger"),
  message: ({ chapterName, role, welcomeNote }, strings) => {
    const copy =
      role === "pilot" ? strings.welcomePilot : strings.welcomePassenger;
    const chapter = chapterName ?? "Cycling Without Age";
    return {
      subject: copy.subject,
      title: fill(copy.title, { chapter }),
      preview: copy.preview,
      heading: copy.heading,
      body: fill(copy.intro, { chapter }),
      note: welcomeNote
        ? { heading: fill(copy.noteHeading, { chapter }), text: welcomeNote }
        : null,
      steps: { heading: copy.howHeading, items: copy.how },
      cta: copy.cta,
      footer: copy.footer,
      template: "welcome",
    };
  },
});
