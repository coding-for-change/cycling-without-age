import { z } from "zod";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { profile } from "@/features/profile";
import { fill } from "@/lib/utils";
import { defineKind } from "./types";

export const chapterMemberJoined = defineKind({
  event: "chapter.memberJoined",
  category: "membership",
  policy: { push: false, email: "never", optional: true },
  payload: z.object({
    memberName: z.string().nullable(),
    chapterName: z.string().nullable(),
  }),
  // An admin who joins their own chapter, or who signs a passenger up, is not
  // told about their own action.
  recipients: async (event) =>
    (await membership.listChapterAdmins(event.chapterId))
      .map((m) => m.userId)
      .filter(
        (userId) => userId !== event.actorUserId && userId !== event.userId,
      ),
  params: async (event) => ({
    memberName: (await profile.getProfile(event.userId))?.name ?? null,
    chapterName: (await chapters.getChapter(event.chapterId))?.name ?? null,
  }),
  href: (event) => `/admin/members/${event.userId}`,
  message: ({ memberName, chapterName }, strings) => {
    const copy = strings.memberJoined;
    const values = {
      name: memberName ?? copy.anonymous,
      chapter: chapterName ?? "Cycling Without Age",
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
