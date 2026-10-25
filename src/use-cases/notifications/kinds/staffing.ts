import { z } from "zod";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { rides } from "@/features/rides";
import { formatMessage } from "@/lib/i18n/format";
import { chapterAdminIds, excluding, nameOfPerson } from "./lookups";
import {
  factsOfRide,
  followsItsPair,
  rideFacts,
  rideStillExists,
  rideWords,
} from "./ride-facts";
import { defineKind } from "./types";

/** The chapter's pilots who are not on this ride, freshest roster first. */
async function pilotsNotOn(rideId: string, chapterId: string) {
  const [pilots, ride] = await Promise.all([
    membership.listPilotMembers([chapterId]),
    rides.listRideParticipants(rideId),
  ]);
  const onRide = new Set(ride?.pilotUserIds ?? []);
  return [...new Set(pilots.map((member) => member.userId))].filter(
    (userId) => !onRide.has(userId),
  );
}

/** A ride pilots may sign up for themselves right now: ahead, short, self-service. */
async function openForSignUp(rideId: string, chapterId: string) {
  const settings = await chapters.getSettings(chapterId);
  if (!settings.pilotsMaySelfAssign) return false;
  return (await rides.getOpenRideForPilot(rideId, [chapterId])) !== null;
}

/**
 * Lifecycle 2D: a ride that still needs pilots is offered to the chapter's
 * pilots who are not on it yet — when it is created short, and again when a
 * pilot steps back or it needs more pilots than before. Whether it is still
 * short is read when the message goes out, so a gap filled in the meantime
 * tells nobody. Several such rides in a week are one card.
 */
export const rideOpened = defineKind({
  event: "ride.opened",
  category: "ride",
  policy: { push: true, email: "ifNoPush", optional: true },
  payload: z.object(rideFacts),
  recipients: async (event) => {
    if (
      followsItsPair(event.pair) ||
      !(await openForSignUp(event.rideId, event.chapterId))
    )
      return [];
    return excluding(
      (await pilotsNotOn(event.rideId, event.chapterId)).filter(
        (userId) => userId !== event.exceptUserId,
      ),
      event.actorUserId,
    );
  },
  params: (event) => factsOfRide(event.rideId, event.pair),
  href: (event) => `/pilot/rides/${event.rideId}`,
  collapseKey: (event) => `rides-open:${event.chapterId}`,
  message: (params, strings, locale) => {
    const copy = strings.rideOpened;
    const values = rideWords(params, strings, locale);
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
      template: "rideOpened",
    };
  },
});

/** Lifecycle 3D: the staffing window opened and the ride is still short. */
export const rideUnderstaffed = defineKind({
  event: "ride.understaffed",
  category: "ride",
  policy: { push: true, email: "ifNoPush", optional: false },
  payload: z.object({
    ...rideFacts,
    assigned: z.string().regex(/^\d+$/),
    required: z.string().regex(/^\d+$/),
  }),
  recipients: async (event) =>
    !followsItsPair(event.pair) && (await rideStillExists(event.rideId))
      ? chapterAdminIds(event.chapterId)
      : [],
  params: async (event) => ({
    ...(await factsOfRide(event.rideId, event.pair)),
    assigned: String(event.assigned),
    required: String(event.required),
  }),
  href: (event) => `/admin/rides/${event.rideId}`,
  message: (params, strings, locale) => {
    const copy = strings.rideUnderstaffed;
    const values = {
      ...rideWords(params, strings, locale),
      assigned: Number(params.assigned),
      required: Number(params.required),
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
      template: "rideUnderstaffed",
    };
  },
});

/**
 * A pilot stepping back themself is news for the chapter: the ride may need
 * someone else now. When an admin took them off, the admins already know.
 */
export const ridePilotWithdrew = defineKind({
  event: "ride.pilotUnassigned",
  category: "ride",
  policy: { push: true, email: "ifNoPush", optional: true },
  payload: z.object({
    ...rideFacts,
    pilotUserId: z.string().nullable(),
    pilotName: z.string().nullable().optional(),
  }),
  recipients: async (event) =>
    event.self &&
    !followsItsPair(event.pair) &&
    (await rideStillExists(event.rideId))
      ? excluding(await chapterAdminIds(event.chapterId), event.actorUserId)
      : [],
  params: async (event) => ({
    ...(await factsOfRide(event.rideId, event.pair)),
    pilotUserId: event.userId,
  }),
  hydrate: async (params) => ({
    ...params,
    pilotName: params.pilotUserId
      ? await nameOfPerson(params.pilotUserId)
      : null,
  }),
  href: (event) => `/admin/rides/${event.rideId}`,
  collapseKey: (event) => `ride-crew:${event.rideId}`,
  message: (params, strings, locale) => {
    const copy = strings.ridePilotWithdrew;
    const values = {
      ...rideWords(params, strings, locale),
      pilot: params.pilotName ?? copy.someone,
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
      template: "ridePilotWithdrew",
    };
  },
});

/**
 * Lifecycle 4B-b: an event the chapter announces reaches the accounts that book
 * for its riders, from the link, and the chapter's pilots who are not on it.
 * A pilot the event is still looking for already heard so from the open ride,
 * so pilots hear of it here only once it no longer waits on them. Someone who
 * both books and pilots reads it as the one booking. Several at once are one
 * card.
 */
export const rideAnnounced = defineKind({
  event: "ride.announced",
  category: "ride",
  policy: { push: true, email: "ifNoPush", optional: true },
  payload: z.object({
    ...rideFacts,
    audience: z.enum(["booker", "pilot"]).optional(),
  }),
  recipients: async (event) => {
    if (!(await rideStillExists(event.rideId))) return [];
    const [bookers, pilots] = await Promise.all([
      passengers.listBookingAccountsOfChapters([event.chapterId]),
      openForSignUp(event.rideId, event.chapterId).then((open) =>
        open ? [] : pilotsNotOn(event.rideId, event.chapterId),
      ),
    ]);
    const booking = new Set(bookers);
    return [
      ...excluding(bookers, event.actorUserId),
      ...excluding(
        pilots.filter((userId) => !booking.has(userId)),
        event.actorUserId,
      ).map((userId) => ({ userId, audience: "pilot" })),
    ];
  },
  params: (event) => factsOfRide(event.rideId),
  href: (event, audience) =>
    audience === "pilot"
      ? `/pilot/rides/${event.rideId}`
      : `/passenger/rides/${event.rideId}`,
  collapseKey: (event) => `events:${event.chapterId}`,
  message: (params, strings, locale) => {
    const copy =
      params.audience === "pilot"
        ? strings.rideAnnouncedPilot
        : strings.rideAnnounced;
    const values = rideWords(params, strings, locale);
    return {
      subject: formatMessage(copy.subject, values, locale),
      preview: formatMessage(copy.preview, values, locale),
      heading: formatMessage(copy.heading, values, locale),
      body: formatMessage(copy.intro, values, locale),
      cta: copy.cta,
      footer: copy.footer,
      template: "rideAnnounced",
    };
  },
});
