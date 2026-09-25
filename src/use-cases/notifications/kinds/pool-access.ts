import { z } from "zod";
import { ORG_NAME } from "@/lib/brand";
import { formatMessage } from "@/lib/i18n/format";
import {
  chapterAdminIds,
  countryAdminIds,
  excluding,
  nameOfChapter,
  nameOfLocation,
} from "./lookups";
import { defineKind } from "./types";

export const poolAccessRequested = defineKind({
  event: "pool.accessRequested",
  category: "fleet",
  policy: { push: true, email: "ifNoPush", optional: true },
  payload: z.object({
    chapterName: z.string().nullable(),
    poolName: z.string().nullable(),
  }),
  recipients: async (event) =>
    excluding(await countryAdminIds(event.countryId), event.actorUserId),
  params: async (event) => {
    const [chapterName, pool] = await Promise.all([
      nameOfChapter(event.chapterId),
      nameOfLocation(event.poolId),
    ]);
    return { chapterName, poolName: pool };
  },
  href: (event) => `/admin/locations/${event.poolId}`,
  message: ({ chapterName, poolName }, strings, locale) => {
    const copy = strings.poolAccessRequested;
    const values = {
      chapter: chapterName ?? ORG_NAME,
      pool: poolName ?? copy.unnamed,
    };
    return {
      subject: formatMessage(copy.subject, values, locale),
      preview: copy.preview,
      heading: copy.heading,
      body: formatMessage(copy.intro, values, locale),
      cta: copy.cta,
      footer: copy.footer,
      template: "poolAccessRequested",
    };
  },
});

export const poolAccessDecided = defineKind({
  event: "pool.accessDecided",
  category: "fleet",
  policy: { push: true, email: "ifNoPush", optional: true },
  payload: z.object({
    chapterName: z.string().nullable(),
    poolName: z.string().nullable(),
    approved: z.boolean(),
    note: z.string().nullable(),
  }),
  recipients: async (event) =>
    excluding(await chapterAdminIds(event.chapterId), event.actorUserId),
  params: async (event) => {
    const [chapterName, pool] = await Promise.all([
      nameOfChapter(event.chapterId),
      nameOfLocation(event.poolId),
    ]);
    return {
      chapterName,
      poolName: pool,
      approved: event.approved,
      note: event.note,
    };
  },
  href: () => "/admin/locations",
  message: ({ chapterName, poolName, approved, note }, strings, locale) => {
    const copy = strings.poolAccessDecided;
    const values = {
      chapter: chapterName ?? ORG_NAME,
      pool: poolName ?? copy.unnamed,
      note: note ?? "",
    };
    const body = formatMessage(
      approved ? copy.introApproved : copy.introRejected,
      values,
      locale,
    );
    return {
      subject: formatMessage(
        approved ? copy.subjectApproved : copy.subjectRejected,
        values,
        locale,
      ),
      preview: copy.preview,
      heading: formatMessage(
        approved ? copy.headingApproved : copy.headingRejected,
        values,
        locale,
      ),
      body: note ? `${body} ${formatMessage(copy.note, values, locale)}` : body,
      cta: copy.cta,
      footer: copy.footer,
      template: "poolAccessDecided",
    };
  },
});
