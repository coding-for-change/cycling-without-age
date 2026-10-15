import { z } from "zod";
import { fleet } from "@/features/fleet";
import { passengers } from "@/features/passengers";
import { rides } from "@/features/rides";
import { formatMessage } from "@/lib/i18n/format";
import { chapterAdminIds, excluding } from "./lookups";
import {
  factsOfRide,
  followsItsPair,
  rideFacts,
  rideNotOver,
  rideWords,
} from "./ride-facts";
import { defineKind } from "./types";

type Pair = Parameters<typeof followsItsPair>[0];

const nameOfRider = async (passengerId: string) => {
  const rider = await passengers.getPassenger(passengerId);
  return rider ? `${rider.firstName} ${rider.lastName}`.trim() : null;
};

/** Everyone on this leg, and on the way back when the message speaks for both. */
async function onEitherLeg(
  rideId: string,
  pair: Pair,
  who: "pilotUserIds" | "riderAccountUserIds",
) {
  const legs = await Promise.all([
    rides.listRideParticipants(rideId),
    pair?.role === "lead"
      ? rides.listRideParticipants(pair.otherRideId).catch(() => null)
      : null,
  ]);
  return [...new Set(legs.flatMap((leg) => leg?.[who] ?? []))];
}

const PICKUP_MAX = 6;

const pickupLine = z.tuple([z.string(), z.string().nullable()]);
const pickupLines = z.array(pickupLine);

/**
 * The bike-collection pack (story 30) as the message carries it: which
 * trishaw, and where it waits. The access code stays on the ride page, behind
 * the sign-in, never in a mail.
 */
async function pickupOf(rideId: string) {
  const ride = await rides.getRideScope(rideId);
  if (!ride?.trishawIds.length) return null;
  const places = await fleet.listTrishawPlaces(
    ride.chapterId,
    ride.trishawIds.slice(0, PICKUP_MAX),
  );
  return JSON.stringify(
    places.map(({ trishaw, location }) => [
      trishaw.name.slice(0, 60),
      location
        ? [location.name, location.address]
            .filter(Boolean)
            .join(", ")
            .slice(0, 80)
        : null,
    ]),
  );
}

const readPickup = (raw: string | null | undefined) => {
  if (!raw) return [];
  try {
    return pickupLines.parse(JSON.parse(raw));
  } catch {
    return [];
  }
};

/**
 * Lifecycle 5B-b: the accounts behind the ride's riders are reminded before
 * it, and asked to confirm the seat or give it up — always, because a seat
 * nobody answers for is a trishaw waiting at the door.
 */
export const rideRiderReminder = defineKind({
  event: "ride.riderReminderDue",
  category: "ride",
  policy: { push: true, email: "always", optional: false },
  payload: z.object(rideFacts),
  recipients: async (event) =>
    followsItsPair(event.pair) || !(await rideNotOver(event.rideId))
      ? []
      : onEitherLeg(event.rideId, event.pair, "riderAccountUserIds"),
  params: (event) => factsOfRide(event.rideId, event.pair),
  href: (event) => `/passenger/rides/${event.rideId}`,
  message: (params, strings, locale) => {
    const copy = strings.rideReminder;
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
      template: "rideReminder",
    };
  },
});

/**
 * Stories 29 and 30: the ride stands, and here is where to pick the bike up.
 * Only the pilots still piloting in the ride's chapter.
 */
export const ridePilotReminder = defineKind({
  event: "ride.volunteerReminderDue",
  category: "ride",
  policy: { push: true, email: "ifNoPush", optional: false },
  payload: z.object({
    ...rideFacts,
    pickup: z.string().max(1000).nullable(),
  }),
  recipients: async (event) =>
    followsItsPair(event.pair) || !(await rideNotOver(event.rideId))
      ? []
      : onEitherLeg(event.rideId, event.pair, "pilotUserIds"),
  params: async (event) => ({
    ...(await factsOfRide(event.rideId, event.pair)),
    pickup: await pickupOf(event.rideId),
  }),
  href: (event) => `/pilot/rides/${event.rideId}`,
  message: (params, strings, locale) => {
    const copy = strings.pilotReminder;
    const values = rideWords(params, strings, locale);
    const pickup = readPickup(params.pickup);
    return {
      subject: formatMessage(copy.subject, values, locale),
      preview: formatMessage(copy.preview, values, locale),
      heading: formatMessage(copy.heading, values, locale),
      body: formatMessage(
        params.bothWays ? copy.introBoth : copy.intro,
        values,
        locale,
      ),
      steps: pickup.length
        ? {
            heading: copy.pickupHeading,
            items: pickup.map(([trishaw, place]) =>
              formatMessage(
                place ? copy.pickupAt : copy.pickupAsk,
                { trishaw, place: place ?? "" },
                locale,
              ),
            ),
          }
        : null,
      cta: copy.cta,
      footer: copy.footer,
      template: "pilotReminder",
    };
  },
});

/** Lifecycle 4C: the roster is still empty this close to the ride. */
export const rideNoDemand = defineKind({
  event: "ride.noDemand",
  category: "ride",
  policy: { push: true, email: "ifNoPush", optional: false },
  payload: z.object(rideFacts),
  recipients: async (event) =>
    !followsItsPair(event.pair) && (await rideNotOver(event.rideId))
      ? chapterAdminIds(event.chapterId)
      : [],
  params: (event) => factsOfRide(event.rideId, event.pair),
  href: (event) => `/admin/rides/${event.rideId}`,
  message: (params, strings, locale) => {
    const copy = strings.rideNoDemand;
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
      template: "rideNoDemand",
    };
  },
});

/**
 * 5B-b, the other way round: the admins were told nobody is left to ride,
 * and now a family took its seat back. One message per leg that filled again.
 */
export const rideRosterRefilled = defineKind({
  event: "ride.rosterRefilled",
  category: "ride",
  policy: { push: true, email: "ifNoPush", optional: true },
  payload: z.object({
    ...rideFacts,
    riderId: z.string().nullable(),
    riderName: z.string().nullable().optional(),
  }),
  recipients: async (event) =>
    (await rideNotOver(event.rideId))
      ? excluding(await chapterAdminIds(event.chapterId), event.actorUserId)
      : [],
  params: async (event) => ({
    ...(await factsOfRide(event.rideId)),
    riderId: event.passengerId,
  }),
  hydrate: async (params) => ({
    ...params,
    riderName: params.riderId ? await nameOfRider(params.riderId) : null,
  }),
  href: (event) => `/admin/rides/${event.rideId}`,
  collapseKey: (event) => `ride:${event.rideId}`,
  message: (params, strings, locale) => {
    const copy = strings.rideRosterRefilled;
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
      template: "rideRosterRefilled",
    };
  },
});
