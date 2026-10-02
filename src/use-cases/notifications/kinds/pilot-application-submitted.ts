import { z } from "zod";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { formatMessage } from "@/lib/i18n/format";
import { nameOfChapter, nameOfPerson } from "./lookups";
import { defineKind } from "./types";
import { ORG_NAME } from "@/lib/brand";

export const pilotApplicationSubmitted = defineKind({
  event: "pilotApplication.submitted",
  category: "application",
  policy: { push: true, email: "ifNoPush", optional: true },
  payload: z.object({
    applicantName: z.string().nullable(),
    chapterName: z.string().nullable(),
  }),
  recipients: async (event) =>
    (await membership.listChapterAdmins(event.chapterId)).map((m) => m.userId),
  params: async (event) => {
    const [applicantName, chapterName] = await Promise.all([
      nameOfPerson(event.userId),
      nameOfChapter(event.chapterId),
    ]);
    return { applicantName, chapterName };
  },
  href: (event) => `/admin/members/${event.userId}`,
  chapterAllowsPush: async (chapterId) =>
    chapterId === null ||
    (await chapters.getSettings(chapterId)).applicationAlertPush,
  message: ({ applicantName, chapterName }, strings, locale) => {
    const copy = strings.applicationSubmitted;
    const values = {
      name: applicantName ?? copy.anonymous,
      chapter: chapterName ?? ORG_NAME,
    };
    return {
      subject: formatMessage(copy.subject, values, locale),
      preview: copy.preview,
      heading: copy.heading,
      body: formatMessage(copy.intro, values, locale),
      cta: copy.cta,
      footer: copy.footer,
      template: "applicationSubmitted",
    };
  },
});
