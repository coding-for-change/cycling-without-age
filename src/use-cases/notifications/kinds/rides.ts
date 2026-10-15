import { z } from "zod";
import { passengers } from "@/features/passengers";
import { rideRequests } from "@/features/ride-requests";
import { RIDE_CANCELLATION_REASONS, rides } from "@/features/rides";
import { formatMessage } from "@/lib/i18n/format";
import { chapterAdminIds, excluding, nameOfPerson } from "./lookups";
import {
  factsOfRide,
  followsItsPair,
  rideAudience,
  rideNotOver,
  rideFacts,
  rideWords,
} from "./ride-facts";
import { defineKind } from "./types";

/**
 * A ride notification goes to people who read the ride in different places —
 * the pilot under `/pilot`, a rider's account under `/passenger`, an admin
 * under `/admin` — so the shared link is `/rides/{id}`, and that route sends
 * each reader to their own page.
 */
const rideLink = (rideId: string) => `/rides/${rideId}`;

async function lookUpRider(passengerId: string) {
  const rider = await passengers.getPassenger(passengerId);
  return rider
    ? {
        name: `${rider.firstName} ${rider.lastName}`.trim(),
        accounts: [rider.managedByUserId, rider.userId].filter(
          (id): id is string => Boolean(id),
        ),
      }
    : { name: null, accounts: [] };
}

/**
 * People are stored as ids and named only when a message is written, so a
 * notification sitting in someone's bell forgets a rider who was deleted.
 */
const person = {
  actorUserId: z.string().nullable(),
  actorName: z.string().nullable().optional(),
};
const rider = {
  riderId: z.string().nullable(),
  riderName: z.string().nullable().optional(),
};

const withActorName = async <T extends { actorUserId: string | null }>(
  params: T,
) => ({
  ...params,
  actorName: params.actorUserId ? await nameOfPerson(params.actorUserId) : null,
});

const withRiderName = async <T extends { riderId: string | null }>(
  params: T,
) => ({
  ...params,
  riderName: params.riderId ? (await lookUpRider(params.riderId)).name : null,
});

const pilot = {
  pilotUserId: z.string().nullable().optional(),
  pilotName: z.string().nullable().optional(),
  self: z.boolean().optional(),
  audience: z.enum(["pilot", "rider"]).optional(),
};

/**
 * An admin putting a pilot on a ride tells the pilot. A pilot signing up
 * themself is told it worked (3C), and the accounts behind the ride's riders
 * learn who their pilot is (story 24b) — one event, two readers, so each row
 * remembers which one it was written for.
 */
export const ridePilotAssigned = defineKind({
  event: "ride.pilotAssigned",
  category: "ride",
  policy: { push: true, email: "ifNoPush", optional: false },
  payload: z.object({ ...rideFacts, ...person, ...pilot }),
  recipients: async (event) => {
    if (followsItsPair(event.pair) || !(await rideNotOver(event.rideId)))
      return [];
    if (!event.self) return excluding([event.userId], event.actorUserId);
    const legs = await Promise.all([
      rides.listRideParticipants(event.rideId),
      event.pair?.role === "lead"
        ? rides.listRideParticipants(event.pair.otherRideId)
        : null,
    ]);
    const riderAccounts = legs.flatMap((leg) => leg?.riderAccountUserIds ?? []);
    return [
      event.userId,
      ...excluding([...new Set(riderAccounts)], event.userId),
    ];
  },
  params: async (event) => ({
    ...(await factsOfRide(event.rideId, event.pair)),
    actorUserId: event.actorUserId,
    pilotUserId: event.userId,
    self: event.self,
  }),
  forRecipient: (params, recipientUserId) => ({
    ...params,
    audience:
      params.self && recipientUserId !== params.pilotUserId
        ? ("rider" as const)
        : ("pilot" as const),
  }),
  hydrate: async (params) => ({
    ...(await withActorName(params)),
    pilotName: params.pilotUserId
      ? await nameOfPerson(params.pilotUserId)
      : null,
  }),
  href: (event) => rideLink(event.rideId),
  message: (params, strings, locale) => {
    const words = rideWords(params, strings, locale);
    if (params.audience === "rider") {
      const copy = strings.ridePilotFound;
      const values = { ...words, pilot: params.pilotName ?? copy.someone };
      return {
        subject: formatMessage(copy.subject, values, locale),
        preview: formatMessage(copy.preview, values, locale),
        heading: formatMessage(copy.heading, values, locale),
        body: formatMessage(
          params.bothWays ? copy.introBoth : copy.intro,
          values,
          locale,
        ),
        cta: copy.cta,
        footer: copy.footer,
        template: "ridePilotFound",
      };
    }
    if (params.self) {
      const copy = strings.rideSignedUp;
      return {
        subject: formatMessage(copy.subject, words, locale),
        preview: formatMessage(copy.preview, words, locale),
        heading: formatMessage(copy.heading, words, locale),
        body: formatMessage(
          params.bothWays ? copy.introBoth : copy.intro,
          words,
          locale,
        ),
        cta: copy.cta,
        footer: copy.footer,
        template: "rideSignedUp",
      };
    }
    const copy = strings.ridePilotAssigned;
    const values = {
      ...words,
      actor: params.actorName ?? strings.rideCommon.byTheChapter,
    };
    return {
      subject: formatMessage(copy.subject, values, locale),
      preview: formatMessage(copy.preview, values, locale),
      heading: formatMessage(copy.heading, values, locale),
      body: formatMessage(
        params.bothWays ? copy.introBoth : copy.intro,
        values,
        locale,
      ),
      cta: copy.cta,
      footer: copy.footer,
      template: "rideAssigned",
    };
  },
});

/**
 * Report 14 and lifecycle 4D: a cancellation reaches everyone the ride
 * concerned — its pilots, its riders' accounts and the chapter's admins —
 * except whoever cancelled it. Always by mail too: someone may already be
 * on their way.
 */
export const rideCancelled = defineKind({
  event: "ride.cancelled",
  category: "ride",
  policy: { push: true, email: "always", optional: false },
  payload: z.object({
    ...rideFacts,
    reasonCode: z.enum(RIDE_CANCELLATION_REASONS),
  }),
  recipients: async (event) =>
    followsItsPair(event.pair)
      ? []
      : rideAudience(event.rideId, event.pair, {
          admins: true,
          actorUserId: event.actorUserId,
        }),
  params: async (event) => ({
    ...(await factsOfRide(event.rideId, event.pair)),
    reasonCode: event.reasonCode,
  }),
  href: (event) => rideLink(event.rideId),
  message: (params, strings, locale) => {
    const copy = strings.rideCancelled;
    const values = {
      ...rideWords(params, strings, locale),
      reason: strings.rideCommon.reasons[params.reasonCode],
    };
    return {
      subject: formatMessage(copy.subject, values, locale),
      preview: formatMessage(copy.preview, values, locale),
      heading: formatMessage(copy.heading, values, locale),
      body: formatMessage(
        params.bothWays ? copy.introBoth : copy.intro,
        values,
        locale,
      ),
      cta: copy.cta,
      footer: copy.footer,
      template: "rideCancelled",
    };
  },
});

/**
 * A new time, a new start or a new destination is news for everyone on the
 * ride — and each is told as what it is, so a moved destination never reads
 * as a moved meeting point.
 */
export const rideRescheduled = defineKind({
  event: "ride.rescheduled",
  category: "ride",
  policy: { push: true, email: "ifNoPush", optional: false },
  payload: z.object({
    ...rideFacts,
    change: z.enum(["time", "location", "destination"]),
  }),
  recipients: async (event) =>
    followsItsPair(event.pair)
      ? []
      : rideAudience(event.rideId, event.pair, {
          admins: false,
          actorUserId: event.actorUserId,
        }),
  params: async (event) => ({
    ...(await factsOfRide(event.rideId, event.pair)),
    change: event.changes.includes("time")
      ? ("time" as const)
      : event.changes.includes("location")
        ? ("location" as const)
        : ("destination" as const),
  }),
  href: (event) => rideLink(event.rideId),
  message: (params, strings, locale) => {
    const copy = strings.rideRescheduled;
    const values = rideWords(params, strings, locale);
    const intro = {
      time: params.bothWays ? copy.introTimeBoth : copy.introTime,
      location: copy.introPlace,
      destination: copy.introDestination,
    }[params.change];
    return {
      subject: formatMessage(copy.subject, values, locale),
      preview: formatMessage(copy.preview, values, locale),
      heading: formatMessage(copy.heading, values, locale),
      body: formatMessage(intro, values, locale),
      cta: copy.cta,
      footer: copy.footer,
      template: "rideChanged",
    };
  },
});

/**
 * A rider booked by scheduling a Ride Request: the request's own message tells
 * the account that asked, with the calendar file, so this one does not.
 */
const requesterOf = async (requestId: string | null) =>
  requestId
    ? ((await rideRequests.getRequestScope(requestId))?.requesterUserId ?? null)
    : null;

export const rideBookingConfirmed = defineKind({
  event: "ride.riderBooked",
  category: "ride",
  policy: { push: true, email: "always", optional: false },
  payload: z.object({ ...rideFacts, ...rider }),
  recipients: async (event) =>
    followsItsPair(event.pair) || !(await rideNotOver(event.rideId))
      ? []
      : excluding(
          (await lookUpRider(event.passengerId)).accounts,
          event.actorUserId,
          await requesterOf(event.requestId),
        ),
  params: async (event) => ({
    ...(await factsOfRide(event.rideId, event.pair)),
    riderId: event.passengerId,
  }),
  hydrate: withRiderName,
  href: (event) => `/passenger/rides/${event.rideId}`,
  message: (params, strings, locale) => {
    const copy = strings.rideBookingConfirmed;
    const values = {
      ...rideWords(params, strings, locale),
      rider: params.riderName ?? copy.someone,
    };
    return {
      subject: formatMessage(copy.subject, values, locale),
      preview: formatMessage(copy.preview, values, locale),
      heading: formatMessage(copy.heading, values, locale),
      body: formatMessage(
        params.bothWays ? copy.introBoth : copy.intro,
        values,
        locale,
      ),
      cta: copy.cta,
      footer: copy.footer,
      template: "rideBooked",
    };
  },
});

/**
 * A rider's own account giving the seat up is news for the chapter: the ride
 * may now be empty, or have room for someone else. When an admin — of the
 * chapter, of its country, or anywhere — took them off, the admins know.
 */
export const rideBookingCancelled = defineKind({
  event: "ride.riderRemoved",
  category: "ride",
  policy: { push: true, email: "ifNoPush", optional: true },
  payload: z.object({ ...rideFacts, ...rider }),
  recipients: async (event) =>
    event.self && (await rideNotOver(event.rideId))
      ? excluding(await chapterAdminIds(event.chapterId), event.actorUserId)
      : [],
  params: async (event) => ({
    ...(await factsOfRide(event.rideId)),
    riderId: event.passengerId,
  }),
  hydrate: withRiderName,
  href: (event) => `/admin/rides/${event.rideId}`,
  collapseKey: (event) => `ride:${event.rideId}`,
  message: (params, strings, locale) => {
    const copy = strings.rideBookingCancelled;
    const values = {
      ...rideWords(params, strings, locale),
      rider: params.riderName ?? copy.someone,
    };
    return {
      subject: formatMessage(copy.subject, values, locale),
      preview: formatMessage(copy.preview, values, locale),
      heading: formatMessage(copy.heading, values, locale),
      body: formatMessage(copy.intro, values, locale),
      cta: copy.cta,
      footer: copy.footer,
      template: "rideBookingCancelled",
    };
  },
});
