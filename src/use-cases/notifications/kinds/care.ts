import { z } from "zod";
import { passengers } from "@/features/passengers";
import { ORG_NAME } from "@/lib/brand";
import { formatMessage } from "@/lib/i18n/format";
import { signInHref } from "@/lib/redirects";
import {
  chapterAdminIds,
  excluding,
  nameOfChapter,
  nameOfPerson,
} from "./lookups";
import { defineKind } from "./types";

const fullName = (person: { firstName: string; lastName: string } | null) =>
  person ? `${person.firstName} ${person.lastName}`.trim() : null;

const riderOfRequest = async (requestId: string) =>
  fullName(await passengers.getCareRequest(requestId));

const firstNameOfRequest = async (requestId: string) =>
  (await passengers.getCareRequestPreview(requestId))?.firstName ?? null;

export const careRequested = defineKind({
  event: "care.requested",
  category: "invitation",
  policy: { push: true, email: "always", optional: false },
  payload: z.object({
    chapterName: z.string().nullable(),
    requesterName: z.string().nullable(),
    riderName: z.string().nullable(),
  }),
  recipients: async (event) => [event.userId],
  params: async (event) => {
    const [chapterName, requesterName, riderName] = await Promise.all([
      nameOfChapter(event.chapterId),
      nameOfPerson(event.actorUserId),
      firstNameOfRequest(event.requestId),
    ]);
    return { chapterName, requesterName, riderName };
  },
  href: (event) => `/care/${event.requestId}`,
  message: ({ chapterName, requesterName, riderName }, strings, locale) => {
    const copy = strings.careRequested;
    const values = {
      chapter: chapterName ?? ORG_NAME,
      requester: requesterName ?? copy.someone,
      rider: riderName ?? copy.someone,
    };
    return {
      subject: formatMessage(copy.subject, values, locale),
      preview: formatMessage(copy.preview, values, locale),
      heading: formatMessage(copy.heading, values, locale),
      body: formatMessage(copy.intro, values, locale),
      cta: copy.cta,
      footer: copy.footer,
      template: "careRequested",
    };
  },
});

export const careDecided = defineKind({
  event: "care.decided",
  category: "membership",
  policy: { push: true, email: "ifNoPush", optional: true },
  payload: z.object({
    caretakerName: z.string().nullable(),
    riderName: z.string().nullable(),
    accepted: z.boolean(),
  }),
  recipients: async (event) =>
    event.requestedByUserId
      ? [event.requestedByUserId]
      : excluding(await chapterAdminIds(event.chapterId), event.actorUserId),
  params: async (event) => {
    const [caretakerName, riderName] = await Promise.all([
      nameOfPerson(event.actorUserId),
      riderOfRequest(event.requestId),
    ]);
    return { caretakerName, riderName, accepted: event.accepted };
  },
  href: () => "/admin/passengers",
  message: ({ caretakerName, riderName, accepted }, strings, locale) => {
    const copy = strings.careDecided;
    const values = {
      caretaker: caretakerName ?? copy.someone,
      rider: riderName ?? copy.someone,
    };
    const pick = (yes: string, no: string) =>
      formatMessage(accepted ? yes : no, values, locale);
    return {
      subject: pick(copy.subjectAccepted, copy.subjectDeclined),
      preview: pick(copy.subjectAccepted, copy.subjectDeclined),
      heading: pick(copy.headingAccepted, copy.headingDeclined),
      body: pick(copy.introAccepted, copy.introDeclined),
      cta: copy.cta,
      footer: copy.footer,
      template: "careDecided",
    };
  },
});

export const careInvited = defineKind({
  event: "care.invited",
  category: "invitation",
  policy: { push: false, email: "always", optional: false },
  payload: z.object({
    chapterName: z.string().nullable(),
    inviterName: z.string().nullable(),
    riderName: z.string().nullable(),
  }),
  recipients: async (event) => [event.userId],
  params: async (event) => {
    const [chapterName, inviterName, rider] = await Promise.all([
      nameOfChapter(event.chapterId),
      nameOfPerson(event.actorUserId),
      passengers.getPassenger(event.passengerId),
    ]);
    return { chapterName, inviterName, riderName: fullName(rider) };
  },
  href: () => signInHref("/passenger/profile/people"),
  message: ({ chapterName, inviterName, riderName }, strings, locale) => {
    const copy = strings.careInvited;
    const values = {
      chapter: chapterName ?? ORG_NAME,
      inviter: inviterName ?? ORG_NAME,
      rider: riderName ?? copy.someone,
    };
    return {
      subject: formatMessage(copy.subject, values, locale),
      preview: formatMessage(copy.preview, values, locale),
      heading: copy.heading,
      body: formatMessage(copy.intro, values, locale),
      steps: { items: [copy.how] },
      cta: copy.cta,
      footer: copy.footer,
      template: "careInvited",
    };
  },
});
