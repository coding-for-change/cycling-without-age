import { z } from "zod";
import { formatMessage } from "@/lib/i18n/format";
import { nameOfChapter, nameOfPerson } from "./lookups";
import { defineKind } from "./types";
import { ORG_NAME } from "@/lib/brand";
import { PERSPECTIVE_HOME } from "@/lib/redirects";

const COPY = {
  promote: "rolePromoted",
  demote: "roleDemoted",
  remove: "memberRemoved",
} as const;

export const memberRoleChanged = defineKind({
  event: "member.roleChanged",
  category: "membership",
  policy: { push: true, email: "always", optional: false },
  payload: z.object({
    chapterName: z.string().nullable(),
    actorName: z.string().nullable(),
    change: z.enum(["promote", "demote", "remove"]),
    roles: z.string(),
  }),
  recipients: async (event) => [event.userId],
  params: async (event) => {
    const [chapterName, actorName] = await Promise.all([
      nameOfChapter(event.chapterId),
      nameOfPerson(event.actorUserId),
    ]);
    return {
      chapterName,
      actorName,
      change: event.change,
      roles: event.roles.join(","),
    };
  },
  href: (event) => {
    if (event.roles.includes("admin")) return PERSPECTIVE_HOME.admin;
    if (event.roles.includes("pilot")) return PERSPECTIVE_HOME.pilot;
    if (event.roles.includes("passenger")) return PERSPECTIVE_HOME.passenger;
    return "/location";
  },
  message: ({ chapterName, actorName, change }, strings, locale) => {
    const copy = strings[COPY[change]];
    const values = {
      chapter: chapterName ?? ORG_NAME,
      actor: actorName ?? ORG_NAME,
    };
    return {
      subject: formatMessage(copy.subject, values, locale),
      preview: copy.preview,
      heading: formatMessage(copy.heading, values, locale),
      body: formatMessage(copy.intro, values, locale),
      cta: copy.cta,
      footer: copy.footer,
      template: "roleChanged",
    };
  },
});
