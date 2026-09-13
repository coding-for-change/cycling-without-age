import { z } from "zod";
import { chapters } from "@/features/chapters";
import { profile } from "@/features/profile";
import { fill } from "@/lib/utils";
import { defineKind } from "./types";

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
  params: async (event) => ({
    chapterName: (await chapters.getChapter(event.chapterId))?.name ?? null,
    actorName: (await profile.getProfile(event.actorUserId))?.name ?? null,
    change: event.change,
    roles: event.roles.join(","),
  }),
  href: (event) => {
    if (event.roles.includes("admin")) return "/admin";
    if (event.roles.includes("pilot")) return "/pilot";
    if (event.roles.includes("passenger")) return "/passenger";
    return "/location";
  },
  message: ({ chapterName, actorName, change }, strings) => {
    const copy = strings[COPY[change]];
    const values = {
      chapter: chapterName ?? "Cycling Without Age",
      actor: actorName ?? "Cycling Without Age",
    };
    return {
      subject: fill(copy.subject, values),
      preview: copy.preview,
      heading: fill(copy.heading, values),
      body: fill(copy.intro, values),
      cta: copy.cta,
      footer: copy.footer,
      template: "roleChanged",
    };
  },
});
