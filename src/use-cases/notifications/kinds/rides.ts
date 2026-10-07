import { z } from "zod";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { RIDE_CANCELLATION_REASONS } from "@/features/rides";
import { formatMessage } from "@/lib/i18n/format";
import { chapterAdminIds, excluding, nameOfPerson } from "./lookups";
import { factsOfRide, rideAudience, rideFacts, rideWords } from "./ride-facts";
import { defineKind } from "./types";

/**
 * A ride notification goes to people who read the ride in different places —
 * the pilot under `/pilot`, a rider's account under `/passenger`, an admin
 * under `/admin` — so the shared link is `/rides/{id}`, and that route sends
 * each reader to their own page.
 */
const rideLink = (rideId: string) => `/rides/${rideId}`;

const riderOf = async (passengerId: string) => {
  const rider = await passengers.getPassenger(passengerId);
  return rider
    ? {
        name: `${rider.firstName} ${rider.lastName}`.trim(),
        accounts: [rider.managedByUserId, rider.userId].filter(
          (id): id is string => Boolean(id),
        ),
      }
    : { name: null, accounts: [] };
};

/** Lifecycle 3C: the pilot an admin put on the ride is told it is theirs. */
export const ridePilotAssigned = defineKind({
  event: "ride.pilotAssigned",
  category: "ride",
  policy: { push: true, email: "ifNoPush", optional: false },
  payload: z.object({ ...rideFacts, actorName: z.string().nullable() }),
  recipients: async (event) =>
    event.self ? [] : excluding([event.userId], event.actorUserId),
  params: async (event) => ({
    ...(await factsOfRide(event.rideId)),
    actorName: event.actorUserId ? await nameOfPerson(event.actorUserId) : null,
  }),
  href: (event) => `/pilot/rides/${event.rideId}`,
  message: (params, strings, locale) => {
    const copy = strings.ridePilotAssigned;
    const values = {
      ...rideWords(params, strings, locale),
      actor: params.actorName ?? strings.rideCommon.theChapter,
    };
    return {
      subject: formatMessage(copy.subject, values, locale),
      preview: formatMessage(copy.preview, values, locale),
      heading: formatMessage(copy.heading, values, locale),
      body: formatMessage(copy.intro, values, locale),
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
  recipients: (event) =>
    rideAudience(event.rideId, {
      admins: true,
      actorUserId: event.actorUserId,
    }),
  params: async (event) => ({
    ...(await factsOfRide(event.rideId)),
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
      body: formatMessage(copy.intro, values, locale),
      cta: copy.cta,
      footer: copy.footer,
      template: "rideCancelled",
    };
  },
});

/** A new time or a new place is news for everyone on the ride. */
export const rideRescheduled = defineKind({
  event: "ride.rescheduled",
  category: "ride",
  policy: { push: true, email: "ifNoPush", optional: false },
  payload: z.object({
    ...rideFacts,
    timeChanged: z.boolean(),
  }),
  recipients: (event) =>
    rideAudience(event.rideId, {
      admins: false,
      actorUserId: event.actorUserId,
    }),
  params: async (event) => ({
    ...(await factsOfRide(event.rideId)),
    timeChanged: event.changes.includes("time"),
  }),
  href: (event) => rideLink(event.rideId),
  message: (params, strings, locale) => {
    const copy = strings.rideRescheduled;
    const values = rideWords(params, strings, locale);
    return {
      subject: formatMessage(copy.subject, values, locale),
      preview: formatMessage(copy.preview, values, locale),
      heading: formatMessage(copy.heading, values, locale),
      body: formatMessage(
        params.timeChanged ? copy.introTime : copy.introPlace,
        values,
        locale,
      ),
      cta: copy.cta,
      footer: copy.footer,
      template: "rideChanged",
    };
  },
});

/**
 * Lifecycle 4B: whoever looks after the rider — the rider themself, or the
 * relative or carer who manages them — is told the seat is theirs.
 */
export const rideBookingConfirmed = defineKind({
  event: "ride.riderBooked",
  category: "ride",
  policy: { push: true, email: "always", optional: false },
  payload: z.object({ ...rideFacts, riderName: z.string().nullable() }),
  recipients: async (event) =>
    excluding((await riderOf(event.passengerId)).accounts, event.actorUserId),
  params: async (event) => ({
    ...(await factsOfRide(event.rideId)),
    riderName: (await riderOf(event.passengerId)).name,
  }),
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
      body: formatMessage(copy.intro, values, locale),
      cta: copy.cta,
      footer: copy.footer,
      template: "rideBooked",
    };
  },
});

/**
 * A rider leaving a ride on their own is news for the chapter: it may now be
 * empty, or have room for someone else. When an admin took them off, the
 * admins already know.
 */
export const rideBookingCancelled = defineKind({
  event: "ride.riderRemoved",
  category: "ride",
  policy: { push: true, email: "ifNoPush", optional: true },
  payload: z.object({ ...rideFacts, riderName: z.string().nullable() }),
  recipients: async (event) => {
    if (!event.actorUserId) return [];
    const roles = await membership.getMemberRoles(
      event.actorUserId,
      event.chapterId,
    );
    if (roles.includes("admin")) return [];
    return excluding(await chapterAdminIds(event.chapterId), event.actorUserId);
  },
  params: async (event) => ({
    ...(await factsOfRide(event.rideId)),
    riderName: (await riderOf(event.passengerId)).name,
  }),
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
