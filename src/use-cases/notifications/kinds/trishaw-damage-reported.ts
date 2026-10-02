import { z } from "zod";
import { chapters } from "@/features/chapters";
import { formatMessage } from "@/lib/i18n/format";
import {
  chapterAdminIds,
  countryAdminIds,
  excluding,
  nameOfPerson,
  nameOfTrishaw,
} from "./lookups";
import { defineKind } from "./types";

/**
 * A grounding damage reaches every admin who could book the trishaw, because
 * their rides may be the ones it no longer serves. A minor one reaches the
 * chapters that have not muted minor damage in their settings. The pool's
 * country admins always hear, since the trishaw is theirs to fix.
 */
export const trishawDamageReported = defineKind({
  event: "trishaw.damageReported",
  category: "fleet",
  policy: { push: true, email: "ifNoPush", optional: false },
  payload: z.object({
    reporterName: z.string().nullable(),
    trishawName: z.string().nullable(),
    grounding: z.boolean(),
    affectedCount: z.string(),
  }),
  recipients: async (event) => {
    const chapterIds = [
      ...new Set(
        [event.chapterId, ...event.reachingChapterIds].filter(
          (id): id is string => id !== null,
        ),
      ),
    ];
    const chapterAdmins = await Promise.all(
      chapterIds.map(async (chapterId) => {
        if (
          !event.grounding &&
          !(await chapters.getSettings(chapterId)).damageAlertPush
        )
          return [];
        return chapterAdminIds(chapterId);
      }),
    );
    const countryAdmins = event.poolCountryId
      ? await countryAdminIds(event.poolCountryId)
      : [];
    return excluding(
      [...new Set([...chapterAdmins.flat(), ...countryAdmins])],
      event.actorUserId,
    );
  },
  params: async (event) => {
    const [reporterName, trishawName] = await Promise.all([
      nameOfPerson(event.actorUserId),
      nameOfTrishaw(event.trishawId),
    ]);
    return {
      reporterName,
      trishawName,
      grounding: event.grounding,
      affectedCount: String(event.affectedRideIds.length),
    };
  },
  href: (event) => `/admin/trishaws/${event.trishawId}`,
  collapseKey: (event) => `damage:${event.damageId}`,
  message: (
    { reporterName, trishawName, grounding, affectedCount },
    strings,
    locale,
  ) => {
    const copy = strings.damageReported;
    const count = Number(affectedCount);
    const values = {
      name: reporterName ?? copy.anonymous,
      trishaw: trishawName ?? copy.unnamed,
      count,
    };
    const affected =
      grounding && count > 0
        ? ` ${formatMessage(copy.affected, values, locale)}`
        : "";
    return {
      subject: formatMessage(
        grounding ? copy.subjectGrounded : copy.subject,
        values,
        locale,
      ),
      preview: copy.preview,
      heading: formatMessage(
        grounding ? copy.headingGrounded : copy.heading,
        values,
        locale,
      ),
      body:
        formatMessage(
          grounding ? copy.introGrounded : copy.intro,
          values,
          locale,
        ) + affected,
      cta: copy.cta,
      footer: copy.footer,
      template: "damageReported",
    };
  },
});
