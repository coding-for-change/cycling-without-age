import { z } from "zod";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { profile } from "@/features/profile";
import { fill } from "@/lib/utils";
import { defineKind } from "./types";

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
  params: async (event) => ({
    applicantName: (await profile.getProfile(event.userId))?.name ?? null,
    chapterName: (await chapters.getChapter(event.chapterId))?.name ?? null,
  }),
  href: (event) => `/admin/members/${event.userId}`,
  chapterAllowsPush: async (chapterId) =>
    chapterId === null ||
    (await chapters.getSettings(chapterId)).applicationAlertPush,
  message: ({ applicantName, chapterName }, strings) => {
    const copy = strings.applicationSubmitted;
    const values = {
      name: applicantName ?? copy.anonymous,
      chapter: chapterName ?? "Cycling Without Age",
    };
    return {
      subject: fill(copy.subject, values),
      preview: copy.preview,
      heading: copy.heading,
      body: fill(copy.intro, values),
      cta: copy.cta,
      footer: copy.footer,
      template: "applicationSubmitted",
    };
  },
});
