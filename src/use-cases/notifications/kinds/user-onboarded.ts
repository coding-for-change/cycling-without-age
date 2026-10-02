import { z } from "zod";
import { chapters } from "@/features/chapters";
import { formatMessage } from "@/lib/i18n/format";
import { defineKind } from "./types";
import { ORG_NAME } from "@/lib/brand";
import { PERSPECTIVE_HOME } from "@/lib/redirects";

export const userOnboarded = defineKind({
  event: "user.onboarded",
  category: "welcome",
  policy: { push: false, email: "always", optional: false },
  payload: z.object({
    chapterName: z.string().nullable(),
    role: z.enum(["pilot", "passenger"]),
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
  href: (event) => PERSPECTIVE_HOME[event.role],
  message: ({ chapterName, role, welcomeNote }, strings, locale) => {
    const copy =
      role === "pilot" ? strings.welcomePilot : strings.welcomePassenger;
    const chapter = chapterName ?? ORG_NAME;
    return {
      subject: copy.subject,
      title: formatMessage(copy.title, { chapter }, locale),
      preview: copy.preview,
      heading: copy.heading,
      body: formatMessage(copy.intro, { chapter }, locale),
      note: welcomeNote
        ? {
            heading: formatMessage(copy.noteHeading, { chapter }, locale),
            text: welcomeNote,
          }
        : null,
      steps: { heading: copy.howHeading, items: Object.values(copy.how) },
      cta: copy.cta,
      footer: copy.footer,
      template: "welcome",
    };
  },
});
