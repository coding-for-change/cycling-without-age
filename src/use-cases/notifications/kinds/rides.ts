import { z } from "zod";
import { passengers } from "@/features/passengers";
import { RIDE_CANCELLATION_REASONS } from "@/features/rides";
import { formatMessage } from "@/lib/i18n/format";
import { chapterAdminIds, excluding, nameOfPerson } from "./lookups";
import {
  factsOfRide,
  followsItsPair,
  rideAudience,
  rideStillExists,
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

/**
 * `notify` asks a kind for recipients and params of the same event side by
 * side; both need the rider, so the lookup is shared per event.
 */
const riders = new WeakMap<object, ReturnType<typeof lookUpRider>>();

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

const riderOf = (event: { passengerId: string }) => {
  const known = riders.get(event);
  if (known) return known;
  const rider = lookUpRider(event.passengerId);
  riders.set(event, rider);
  return rider;
};

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

export const ridePilotAssigned = defineKind({
  event: "ride.pilotAssigned",
  category: "ride",
  policy: { push: true, email: "ifNoPush", optional: false },
  payload: z.object({ ...rideFacts, ...person }),
  recipients: async (event) =>
    event.self ||
    followsItsPair(event.pair) ||
    !(await rideStillExists(event.rideId))
      ? []
      : excluding([event.userId], event.actorUserId),
  params: async (event) => ({
    ...(await factsOfRide(event.rideId, event.pair)),
    actorUserId: event.actorUserId,
  }),
  hydrate: withActorName,
  href: (event) => `/pilot/rides/${event.rideId}`,
  message: (params, strings, locale) => {
    const copy = strings.ridePilotAssigned;
    const values = {
      ...rideWords(params, strings, locale),
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

export const rideBookingConfirmed = defineKind({
  event: "ride.riderBooked",
  category: "ride",
  policy: { push: true, email: "always", optional: false },
  payload: z.object({ ...rideFacts, ...rider }),
  recipients: async (event) =>
    followsItsPair(event.pair) || !(await rideStillExists(event.rideId))
      ? []
      : excluding((await riderOf(event)).accounts, event.actorUserId),
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
    event.self && (await rideStillExists(event.rideId))
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
