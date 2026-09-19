import { z } from "zod";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { fill } from "@/lib/utils";
import { nameOfChapter, nameOfPerson } from "./lookups";
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
    return (await membership.listChapterAdmins(event.chapterId))
      .map((m) => m.userId)
      .filter(
        (userId) => userId !== event.actorUserId && userId !== event.userId,
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
  message: ({ memberName, chapterName }, strings) => {
    const copy = strings.memberJoined;
    const values = {
      name: memberName ?? copy.anonymous,
      chapter: chapterName ?? ORG_NAME,
    };
    return {
      subject: fill(copy.subject, values),
      preview: copy.preview,
      heading: copy.heading,
      body: fill(copy.intro, values),
      cta: copy.cta,
      footer: copy.footer,
      template: "memberJoined",
    };
  },
});
