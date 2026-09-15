import { z } from "zod";
import { formatList, wordsLocale } from "@/lib/format";
import { fill } from "@/lib/utils";
import { nameOfChapter, nameOfPerson } from "./lookups";
import { defineKind } from "./types";
import { ORG_NAME } from "@/lib/brand";
import { PERSPECTIVE_HOME, signInHref } from "@/lib/redirects";

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
  params: async (event) => {
    const [chapterName, inviterName] = await Promise.all([
      nameOfChapter(event.chapterId),
      nameOfPerson(event.actorUserId),
    ]);
    return { chapterName, inviterName, roles: event.roles.join(",") };
  },
  href: (event) =>
    signInHref(
      event.roles.includes("admin")
        ? PERSPECTIVE_HOME.admin
        : PERSPECTIVE_HOME.pilot,
    ),
  message: ({ chapterName, inviterName, roles }, strings, locale) => {
    const copy = strings.invite;
    const chapter = chapterName ?? ORG_NAME;
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
        inviter: inviterName ?? ORG_NAME,
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
