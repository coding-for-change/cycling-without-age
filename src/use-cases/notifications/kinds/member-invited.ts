import { z } from "zod";
import { chapters } from "@/features/chapters";
import { profile } from "@/features/profile";
import { formatList, wordsLocale } from "@/lib/format";
import { fill } from "@/lib/utils";
import { defineKind } from "./types";

export const memberInvited = defineKind({
  event: "member.invited",
  category: "invitation",
  policy: { push: true, email: "always", optional: false },
  payload: z.object({
    chapterName: z.string().nullable(),
    inviterName: z.string().nullable(),
    roles: z.string(),
  }),
  recipients: async (event) => [event.userId],
  params: async (event) => ({
    chapterName: (await chapters.getChapter(event.chapterId))?.name ?? null,
    inviterName: (await profile.getProfile(event.actorUserId))?.name ?? null,
    roles: event.roles.join(","),
  }),
  href: (event) =>
    event.roles.includes("admin")
      ? "/sign-in?next=%2Fadmin"
      : "/sign-in?next=%2Fpilot",
  message: ({ chapterName, inviterName, roles }, strings, locale) => {
    const copy = strings.invite;
    const chapter = chapterName ?? "Cycling Without Age";
    const role = formatList(
      roles
        .split(",")
        .filter((name): name is keyof typeof strings.roles =>
          Object.hasOwn(strings.roles, name),
        )
        .map((name) => strings.roles[name]),
      wordsLocale(locale),
    );
    return {
      subject: fill(copy.subject, { chapter }),
      preview: copy.preview,
      heading: copy.heading,
      body: fill(copy.intro, {
        inviter: inviterName ?? "Cycling Without Age",
        chapter,
        role,
      }),
      steps: { items: [copy.how] },
      cta: copy.cta,
      footer: copy.footer,
      template: "invite",
    };
  },
});
