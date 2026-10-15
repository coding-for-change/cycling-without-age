import { z } from "zod";
import type { EmailStrings } from "@/emails/strings";
import { chapters } from "@/features/chapters";
import { passengers } from "@/features/passengers";
import { rideRequests } from "@/features/ride-requests";
import { RIDE_MODELS, rides } from "@/features/rides";
import { APP_URL } from "@/lib/app-url";
import { formatList, wordsLocale } from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import type { IcsEvent } from "@/lib/ics";
import { chapterAdminIds, excluding, nameOfPerson } from "./lookups";
import { factsOfRide, rideFacts, rideWords } from "./ride-facts";
import { defineKind } from "./types";

const requestLink = (requestId: string) => `/admin/rides/requests/${requestId}`;

/**
 * What a request message says: who asked, for whom, when and from where. The
 * window travels as ISO strings with the chapter's zone, like a ride's, and
 * people are ids named only when the message is written.
 */
const requestFacts = {
  model: z.enum(RIDE_MODELS).nullable(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  timeZone: z.string().nullable(),
  place: z.string().nullable(),
  destination: z.string().nullable(),
  chapterName: z.string().nullable(),
  roundTrip: z.boolean(),
  riderIds: z.string(),
  riderNames: z.string().nullable().optional(),
  requesterId: z.string().nullable(),
  requesterName: z.string().nullable().optional(),
};

const requestFactsSchema = z.object(requestFacts);
type RequestFacts = z.infer<typeof requestFactsSchema>;

async function factsOfRequest(requestId: string) {
  const request = await rideRequests.getRequest(requestId);
  return {
    model: request?.model ?? null,
    startsAt: request?.requestedStartsAt.toISOString() ?? null,
    endsAt: request?.requestedEndsAt.toISOString() ?? null,
    timeZone: request?.chapter.timeZone ?? null,
    place: request?.pickupName ?? null,
    destination: request?.destinationName ?? null,
    chapterName: request?.chapter.name ?? null,
    roundTrip: request?.roundTrip ?? false,
    riderIds: (request?.passengers ?? [])
      .map(({ passenger }) => passenger.id)
      .join(","),
    requesterId: request?.requesterUserId ?? null,
  };
}

const idsOf = (joined: string) => joined.split(",").filter(Boolean);

async function riderNamesOf(riderIds: string) {
  const ids = idsOf(riderIds);
  const names = await passengers.passengerNames(ids);
  const known = ids.flatMap((id) => (names[id] ? [names[id]] : []));
  return known.length ? known.join("\n") : null;
}

const withRiderNames = async <T extends { riderIds: string }>(params: T) => ({
  ...params,
  riderNames: await riderNamesOf(params.riderIds),
});

async function withNames<
  T extends { riderIds: string; requesterId: string | null },
>(params: T) {
  const [named, requesterName] = await Promise.all([
    withRiderNames(params),
    params.requesterId ? nameOfPerson(params.requesterId) : null,
  ]);
  return { ...named, requesterName };
}

const ridersIn = (
  riderNames: string | null | undefined,
  fallback: string,
  locale: Locale,
) =>
  riderNames
    ? formatList(riderNames.split("\n"), wordsLocale(locale))
    : fallback;

function requestWords(
  params: RequestFacts,
  strings: EmailStrings,
  locale: Locale,
) {
  const copy = strings.rideRequestCommon;
  const words = rideWords(
    { ...params, rideTitle: null, bothWays: params.roundTrip },
    strings,
    locale,
  );
  return {
    ...words,
    riders: ridersIn(params.riderNames, copy.someone, locale),
    requester: params.requesterName ?? copy.someoneAsking,
  };
}

const stillPending = async (requestId: string) =>
  (await rideRequests.getRequestScope(requestId))?.status === "pending";

const requestAlertsOn = async (chapterId: string | null) =>
  chapterId === null ||
  (await chapters.getSettings(chapterId)).requestAlertPush;

/**
 * Lifecycle 1C: the chapter's admins hear of a new request — unless it has
 * become a ride or been taken back by the time the worker gets to it. Several
 * requests share one card per chapter.
 */
export const rideRequestSubmitted = defineKind({
  event: "rideRequest.submitted",
  category: "request",
  policy: { push: true, email: "ifNoPush", optional: true },
  payload: requestFactsSchema,
  recipients: async (event) =>
    (await stillPending(event.requestId))
      ? excluding(await chapterAdminIds(event.chapterId), event.actorUserId)
      : [],
  params: (event) => factsOfRequest(event.requestId),
  hydrate: withNames,
  href: (event) => requestLink(event.requestId),
  collapseKey: (event) => `requests:${event.chapterId}`,
  chapterAllowsPush: requestAlertsOn,
  message: (params, strings, locale) => {
    const copy = strings.rideRequestSubmitted;
    const values = requestWords(params, strings, locale);
    const intro =
      params.model === "functional"
        ? params.roundTrip
          ? copy.introThereAndBack
          : copy.introThere
        : copy.intro;
    return {
      subject: formatMessage(copy.subject, values, locale),
      preview: formatMessage(copy.preview, values, locale),
      heading: copy.heading,
      body: formatMessage(intro, values, locale),
      cta: copy.cta,
      footer: copy.footer,
      template: "rideRequestSubmitted",
    };
  },
});

/** The requester took the request back: the chapter's list is one shorter. */
export const rideRequestWithdrawn = defineKind({
  event: "rideRequest.withdrawn",
  category: "request",
  policy: { push: true, email: "ifNoPush", optional: true },
  payload: requestFactsSchema,
  recipients: async (event) =>
    excluding(await chapterAdminIds(event.chapterId), event.actorUserId),
  params: (event) => factsOfRequest(event.requestId),
  hydrate: withNames,
  href: (event) => requestLink(event.requestId),
  collapseKey: (event) => `requests:${event.chapterId}`,
  chapterAllowsPush: requestAlertsOn,
  message: (params, strings, locale) => {
    const copy = strings.rideRequestWithdrawn;
    const values = requestWords(params, strings, locale);
    return {
      subject: formatMessage(copy.subject, values, locale),
      preview: formatMessage(copy.preview, values, locale),
      heading: copy.heading,
      body: formatMessage(copy.intro, values, locale),
      cta: copy.cta,
      footer: copy.footer,
      template: "rideRequestWithdrawn",
    };
  },
});

/** Lifecycle 1E: the chapter said no, and may say why. Always by mail too. */
export const rideRequestDeclined = defineKind({
  event: "rideRequest.declined",
  category: "request",
  policy: { push: true, email: "always", optional: false },
  payload: z.object({ ...requestFacts, note: z.string().nullable() }),
  recipients: async (event) =>
    event.requesterUserId ? [event.requesterUserId] : [],
  params: async (event) => {
    const [facts, request] = await Promise.all([
      factsOfRequest(event.requestId),
      rideRequests.getRequest(event.requestId),
    ]);
    return { ...facts, note: request?.decisionNote ?? null };
  },
  hydrate: withNames,
  href: (event) => `/passenger/rides/requests/${event.requestId}`,
  message: (params, strings, locale) => {
    const copy = strings.rideRequestDeclined;
    const values = requestWords(params, strings, locale);
    return {
      subject: formatMessage(copy.subject, values, locale),
      preview: formatMessage(copy.preview, values, locale),
      heading: copy.heading,
      body: formatMessage(copy.intro, values, locale),
      note: params.note
        ? {
            heading: formatMessage(copy.noteHeading, values, locale),
            text: params.note,
          }
        : null,
      cta: copy.cta,
      footer: copy.footer,
      template: "rideRequestDeclined",
    };
  },
});

const UID_HOST = new URL(APP_URL).host;
const PROD_ID = "-//Coding for Change//CWA GO//EN";

const placeLine = (name: string | null, destination: string | null) =>
  name ?? destination ?? null;

/**
 * Lifecycle 1E and COD-182: the requester learns the ride exists, with the
 * ride in their calendar — one event per leg, no one's name in it, and the
 * same UID the subscribed feed uses, so importing both never doubles it.
 */
export const rideRequestScheduled = defineKind({
  event: "rideRequest.scheduled",
  category: "request",
  policy: { push: true, email: "always", optional: false },
  payload: z.object({
    ...rideFacts,
    rideId: z.string(),
    returnLegId: z.string().nullable(),
    returnStartsAt: z.string().nullable(),
    returnEndsAt: z.string().nullable(),
    returnPlace: z.string().nullable(),
    riderIds: z.string(),
    riderNames: z.string().nullable().optional(),
  }),
  recipients: async (event) =>
    event.requesterUserId ? [event.requesterUserId] : [],
  params: async (event) => {
    const pair = event.returnLegId
      ? { role: "lead" as const, otherRideId: event.returnLegId }
      : null;
    const [facts, back, request] = await Promise.all([
      factsOfRide(event.rideId, pair),
      event.returnLegId ? rides.getRideFacts(event.returnLegId) : null,
      rideRequests.getRequest(event.requestId),
    ]);
    return {
      ...facts,
      rideId: event.rideId,
      returnLegId: event.returnLegId,
      returnStartsAt: back?.startsAt.toISOString() ?? null,
      returnEndsAt: back?.endsAt.toISOString() ?? null,
      returnPlace: back?.locationName ?? null,
      riderIds: (request?.passengers ?? [])
        .map(({ passenger }) => passenger.id)
        .join(","),
    };
  },
  hydrate: withRiderNames,
  href: (event) => `/passenger/rides/${event.rideId}`,
  message: (params, strings, locale) => {
    const copy = strings.rideRequestScheduled;
    const words = rideWords(params, strings, locale);
    const back =
      params.returnStartsAt && params.returnEndsAt && params.timeZone
        ? rideWords(
            {
              ...params,
              startsAt: params.returnStartsAt,
              endsAt: params.returnEndsAt,
            },
            strings,
            locale,
          ).time
        : null;
    const values = {
      ...words,
      back: back ?? words.time,
      riders: ridersIn(
        params.riderNames,
        strings.rideRequestCommon.someone,
        locale,
      ),
    };
    return {
      subject: formatMessage(copy.subject, values, locale),
      preview: formatMessage(copy.preview, values, locale),
      heading: copy.heading,
      body: formatMessage(back ? copy.introBoth : copy.intro, values, locale),
      note: { heading: copy.calendarHeading, text: copy.calendarText },
      cta: copy.cta,
      footer: copy.footer,
      template: "rideRequestScheduled",
    };
  },
  attachments: (params, strings, locale) => {
    const copy = strings.rideRequestScheduled;
    const model = params.model
      ? strings.calendarFeed.models[params.model]
      : strings.rideCommon.aRide;
    const summary = formatMessage(
      copy.calendarSummary,
      { ride: model, chapter: params.chapterName ?? strings.calendarFeed.name },
      locale,
    );
    const url = `${APP_URL}/passenger/rides/${params.rideId}`;
    const description = formatMessage(
      strings.calendarFeed.details,
      { url },
      locale,
    );
    const leg = (
      id: string,
      startsAt: string,
      endsAt: string,
      location: string | null,
    ): IcsEvent => ({
      uid: `ride-${id}@${UID_HOST}`,
      start: new Date(startsAt),
      end: new Date(endsAt),
      stamp: new Date(),
      summary,
      location,
      description,
      url,
      status: "CONFIRMED",
    });
    const events = [
      ...(params.startsAt && params.endsAt
        ? [
            leg(
              params.rideId,
              params.startsAt,
              params.endsAt,
              placeLine(params.place, null),
            ),
          ]
        : []),
      ...(params.returnLegId && params.returnStartsAt && params.returnEndsAt
        ? [
            leg(
              params.returnLegId,
              params.returnStartsAt,
              params.returnEndsAt,
              placeLine(params.returnPlace, params.destination),
            ),
          ]
        : []),
    ];
    if (!events.length) return [];
    return [
      {
        filename: copy.calendarFile,
        calendar: { prodId: PROD_ID, name: summary, events },
      },
    ];
  },
});

/**
 * A rider moved to another account: the one who now books for them and the
 * one who no longer does both hear it, each in their own words. The one who
 * no longer does is not told who does now — a hand-over can be a
 * safeguarding decision.
 */
export const riderHandedOver = defineKind({
  event: "rider.handedOver",
  category: "membership",
  policy: { push: true, email: "always", optional: false },
  payload: z.object({
    riderId: z.string(),
    riderName: z.string().nullable().optional(),
    chapterName: z.string().nullable(),
    fromUserId: z.string(),
    toUserId: z.string(),
    audience: z.enum(["from", "to"]).optional(),
  }),
  recipients: async (event) =>
    excluding(
      [...new Set([event.toUserId, event.fromUserId])],
      event.actorUserId,
      event.invited ? event.toUserId : null,
    ),
  params: async (event) => ({
    riderId: event.passengerId,
    chapterName: (await chapters.getChapter(event.chapterId))?.name ?? null,
    fromUserId: event.fromUserId,
    toUserId: event.toUserId,
  }),
  forRecipient: (params, recipientUserId) => ({
    ...params,
    audience:
      recipientUserId === params.toUserId ? ("to" as const) : ("from" as const),
  }),
  hydrate: async (params) => ({
    ...params,
    riderName:
      (await passengers.passengerNames([params.riderId]))[params.riderId] ??
      null,
  }),
  href: () => "/passenger/profile/people",
  message: (params, strings, locale) => {
    const copy =
      params.audience === "from"
        ? strings.riderHandedAway
        : strings.riderHandedOver;
    const common = strings.rideRequestCommon;
    const values = {
      rider: params.riderName ?? common.someone,
      chapter: params.chapterName ?? strings.rideCommon.theChapter,
    };
    return {
      subject: formatMessage(copy.subject, values, locale),
      preview: formatMessage(copy.preview, values, locale),
      heading: formatMessage(copy.heading, values, locale),
      body: formatMessage(copy.intro, values, locale),
      cta: copy.cta,
      footer: copy.footer,
      template:
        params.audience === "from" ? "riderHandedAway" : "riderHandedOver",
    };
  },
});
