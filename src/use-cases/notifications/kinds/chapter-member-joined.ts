import { z } from "zod";
import { chapters } from "@/features/chapters";
import { formatMessage } from "@/lib/i18n/format";
import {
  chapterAdminIds,
  excluding,
  nameOfChapter,
  nameOfPerson,
} from "./lookups";
import { defineKind } from "./types";
import { ORG_NAME } from "@/lib/brand";

export const chapterMemberJoined = defineKind({
  event: "chapter.memberJoined",
  category: "membership",
  policy: { push: false, email: "never", optional: true },
  payload: z.object({
    memberName: z.string().nullable(),
    chapterName: z.string().nullable(),
  }),
  recipients: async (event) => {
    const settings = await chapters.getSettings(event.chapterId);
    if (!settings.notifyOnMemberJoined) return [];
    return excluding(
      await chapterAdminIds(event.chapterId),
      event.actorUserId,
      event.userId,
    );
  },
  params: async (event) => {
    const [memberName, chapterName] = await Promise.all([
      nameOfPerson(event.userId),
      nameOfChapter(event.chapterId),
    ]);
    return { memberName, chapterName };
  },
  href: (event) => `/admin/members/${event.userId}`,
  message: ({ memberName, chapterName }, strings, locale) => {
    const copy = strings.memberJoined;
    const values = {
      name: memberName ?? copy.anonymous,
      chapter: chapterName ?? ORG_NAME,
    };
    return {
      subject: formatMessage(copy.subject, values, locale),
      preview: copy.preview,
      heading: copy.heading,
      body: formatMessage(copy.intro, values, locale),
      cta: copy.cta,
      footer: copy.footer,
      template: "memberJoined",
    };
  },
});
