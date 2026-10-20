import { z } from "zod";
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

/**
 * Lifecycle 2D: a ride that still needs pilots is offered to the chapter's
 * pilots who are not on it yet. Several new rides in a week are one card.
 */
export const rideOpened = defineKind({
  event: "ride.opened",
  category: "ride",
  policy: { push: true, email: "ifNoPush", optional: true },
  payload: z.object(rideFacts),
  recipients: async (event) => {
    if (followsItsPair(event.pair) || !(await rideStillExists(event.rideId)))
      return [];
    const [pilots, ride] = await Promise.all([
      membership.listPilotMembers([event.chapterId]),
      rides.listRideParticipants(event.rideId),
    ]);
    const onRide = new Set(ride?.pilotUserIds ?? []);
    return excluding(
      [...new Set(pilots.map((member) => member.userId))].filter(
        (userId) => !onRide.has(userId),
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
 * for its riders, from the link. Several at once are one card.
 */
export const rideAnnounced = defineKind({
  event: "ride.announced",
  category: "ride",
  policy: { push: true, email: "ifNoPush", optional: true },
  payload: z.object(rideFacts),
  recipients: async (event) =>
    (await rideStillExists(event.rideId))
      ? excluding(
          await passengers.listBookingAccountsOfChapters([event.chapterId]),
          event.actorUserId,
        )
      : [],
  params: (event) => factsOfRide(event.rideId),
  href: (event) => `/passenger/rides/${event.rideId}`,
  collapseKey: (event) => `events:${event.chapterId}`,
  message: (params, strings, locale) => {
    const copy = strings.rideAnnounced;
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
