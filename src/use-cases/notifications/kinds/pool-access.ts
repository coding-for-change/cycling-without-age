import { z } from "zod";
import { ORG_NAME } from "@/lib/brand";
import { fill } from "@/lib/utils";
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
  message: ({ chapterName, poolName }, strings) => {
    const copy = strings.poolAccessRequested;
    const values = {
      chapter: chapterName ?? ORG_NAME,
      pool: poolName ?? copy.unnamed,
    };
    return {
      subject: fill(copy.subject, values),
      preview: copy.preview,
      heading: copy.heading,
      body: fill(copy.intro, values),
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
  message: ({ chapterName, poolName, approved, note }, strings) => {
    const copy = strings.poolAccessDecided;
    const values = {
      chapter: chapterName ?? ORG_NAME,
      pool: poolName ?? copy.unnamed,
      note: note ?? "",
    };
    const body = fill(
      approved ? copy.introApproved : copy.introRejected,
      values,
    );
    return {
      subject: fill(
        approved ? copy.subjectApproved : copy.subjectRejected,
        values,
      ),
      preview: copy.preview,
      heading: fill(
        approved ? copy.headingApproved : copy.headingRejected,
        values,
      ),
      body: note ? `${body} ${fill(copy.note, values)}` : body,
      cta: copy.cta,
      footer: copy.footer,
      template: "poolAccessDecided",
    };
  },
});
