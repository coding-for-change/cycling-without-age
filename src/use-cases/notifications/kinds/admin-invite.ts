import { z } from "zod";
import { admins } from "@/features/admins";
import { ORG_NAME } from "@/lib/brand";
import { formatMessage } from "@/lib/i18n/format";
import { signInHref } from "@/lib/redirects";
import { nameOfCountry, nameOfPerson } from "./lookups";
import { defineKind } from "./types";

export const adminInvited = defineKind({
  event: "adminInvite.created",
  category: "invitation",
  policy: { push: true, email: "always", optional: false },
  payload: z.object({
    kind: z.enum(["superadmin", "countryAdmin"]),
    countryName: z.string().nullable(),
    inviterName: z.string().nullable(),
  }),
  recipients: async (event) => [event.userId],
  params: async (event) => {
    const [countryName, inviterName] = await Promise.all([
      event.countryId ? nameOfCountry(event.countryId) : null,
      nameOfPerson(event.actorUserId),
    ]);
    return { kind: event.kind, countryName, inviterName };
  },
  href: (event) => signInHref(admins.inviteHref(event.inviteId)),
  message: ({ kind, countryName, inviterName }, strings, locale) => {
    const copy = strings.adminInvite;
    const role = copy[kind];
    const values = {
      inviter: inviterName ?? ORG_NAME,
      country: countryName ?? ORG_NAME,
    };
    return {
      subject: formatMessage(role.subject, values, locale),
      preview: copy.preview,
      heading: formatMessage(role.heading, values, locale),
      body: formatMessage(role.intro, values, locale),
      steps: { items: [copy.how] },
      cta: copy.cta,
      footer: copy.footer,
      template: "adminInvite",
    };
  },
});

export const superadminRemoved = defineKind({
  event: "superadmin.removed",
  category: "membership",
  policy: { push: true, email: "always", optional: false },
  payload: z.object({ actorName: z.string().nullable() }),
  recipients: async (event) =>
    event.actorUserId === event.userId ? [] : [event.userId],
  params: async (event) => ({
    actorName: await nameOfPerson(event.actorUserId),
  }),
  href: () => "/",
  message: ({ actorName }, strings, locale) => {
    const copy = strings.superadminRemoved;
    return {
      subject: copy.subject,
      preview: copy.preview,
      heading: copy.heading,
      body: formatMessage(copy.intro, { actor: actorName ?? ORG_NAME }, locale),
      cta: copy.cta,
      footer: copy.footer,
      template: "superadminRemoved",
    };
  },
});
