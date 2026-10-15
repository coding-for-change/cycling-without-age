import {
  getEmailStrings,
  resolveEmailLocale,
  type EmailStrings,
} from "@/emails/strings";
import { calendarFeeds } from "@/features/calendar-feeds";
import { membership } from "@/features/membership";
import { passengers, pickupOf } from "@/features/passengers";
import { rides } from "@/features/rides";
import { APP_URL } from "@/lib/app-url";
import { renderIcs, type IcsEvent } from "@/lib/ics";
import { serializeError } from "@/lib/observability/errors";
import { logger } from "@/lib/observability/logger";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";

type FeedStrings = EmailStrings["calendarFeed"];

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A client drops whatever a feed stops listing, so the window reaches back far
 * enough that last month's rides stay on the wall, and forward past anything a
 * chapter plans today.
 */
const PAST_DAYS = 90;
const FUTURE_DAYS = 400;
const REFRESH_MINUTES = 60;

const PROD_ID = "-//Coding for Change//CWA GO//EN";
const UID_HOST = new URL(APP_URL).host;

const place = (name: string | null, address: string | null) =>
  [name, address].filter(Boolean).join(", ") || null;

/**
 * Each of a caretaker's riders keeps one colour for as long as they are
 * looked after: handed out in the order the riders were added, so adding a
 * new rider never repaints the ones already on the wall.
 */
const RIDER_COLORS = [
  "teal",
  "darkorange",
  "mediumpurple",
  "royalblue",
  "crimson",
  "goldenrod",
  "seagreen",
  "hotpink",
  "sienna",
  "slategray",
] as const;

type NamedRider = { firstName: string; color: string };

type Audience = rides.FeedAudience & {
  /** Only for a caretaker: the riders they look after, never themself. */
  named: Map<string, NamedRider> | null;
};

/**
 * `/pilot`'s own rule: the pilot role somewhere lets a member in, and only the
 * chapters they still belong to are theirs to read. A demoted or departed pilot
 * keeps their `RideAssignment` rows, so this — not the assignment — decides.
 */
async function audienceOf(userId: string): Promise<Audience> {
  const [memberships, managed, own] = await Promise.all([
    membership.listMembershipsOfUser(userId),
    passengers.listPassengersManagedBy(userId),
    passengers.getOwnPassenger(userId),
  ]);
  const pilots = memberships.some(({ roles }) => roles.includes("pilot"));
  const others = passengers.othersOf(managed);
  return {
    pilotChapterIds: pilots
      ? memberships.map(({ chapterId }) => chapterId)
      : [],
    passengerIds: [
      ...new Set([...managed, ...(own ? [own] : [])].map(({ id }) => id)),
    ],
    named: others.length
      ? new Map(
          others.map((rider, index) => [
            rider.id,
            {
              firstName: rider.firstName,
              color: RIDER_COLORS[index % RIDER_COLORS.length],
            },
          ]),
        )
      : null,
  };
}

function ridersOn(ride: rides.RideFeedRow, named: Audience["named"]) {
  if (!named) return [];
  return ride.roster.flatMap(({ passenger }) => {
    const rider = named.get(passenger.id);
    return rider ? [{ ...rider, pickup: pickupOf(passenger) }] : [];
  });
}

function toEvent(
  ride: rides.RideFeedRow,
  strings: FeedStrings,
  audience: Audience,
  locale: Locale,
): IcsEvent {
  const piloting =
    ride.assignments.length > 0 &&
    audience.pilotChapterIds.includes(ride.chapterId);
  const model = strings.models[ride.model];
  const role = piloting
    ? formatMessage(strings.pilot, { model }, locale)
    : model;
  const riders = ridersOn(ride, audience.named);
  const names = riders.map(({ firstName }) => firstName).join(", ");
  const title = riders.length
    ? formatMessage(strings.forRiders, { title: role, names }, locale)
    : role;
  const cancelled = ride.status === "cancelled";
  const destination = place(ride.destinationName, ride.destinationAddress);
  const trishaws = ride.trishaws.map(({ trishaw }) => trishaw.name);
  const href = `${APP_URL}/${piloting ? "pilot" : "passenger"}`;
  const [only] = riders.length === 1 ? riders : [];
  const home = only?.pickup?.residence === "home" ? only.pickup.address : null;

  return {
    uid: `ride-${ride.id}@${UID_HOST}`,
    start: ride.startsAt,
    end: ride.endsAt,
    stamp: ride.updatedAt,
    summary: cancelled
      ? formatMessage(strings.cancelled, { title }, locale)
      : title,
    location: home ?? place(ride.locationName, ride.locationAddress),
    description: [
      ride.chapter.name,
      riders.length > 0 &&
        formatMessage(strings.riders, { count: riders.length, names }, locale),
      destination &&
        formatMessage(strings.destination, { place: destination }, locale),
      trishaws.length > 0 &&
        formatMessage(strings.trishaws, { names: trishaws.join(", ") }, locale),
      formatMessage(strings.details, { url: href }, locale),
    ]
      .filter(Boolean)
      .join("\n"),
    url: href,
    status: cancelled ? "CANCELLED" : "CONFIRMED",
    ...(riders.length
      ? {
          color: riders[0].color,
          categories: riders.map(({ firstName }) => firstName),
        }
      : {}),
  };
}

/**
 * The whole feed for one address, or `null` when the address opens nothing —
 * unknown, reset, turned off, or its owner banned. The caller cannot tell
 * those apart, and neither can whoever is holding the link.
 */
export async function renderCalendarFeed(
  token: string,
  now = new Date(),
): Promise<string | null> {
  const feed = await calendarFeeds.openFeed(token, now);
  if (!feed) return null;

  const audience = await audienceOf(feed.userId);
  const [list] = await Promise.all([
    rides.listRidesForCalendarFeed(
      feed.userId,
      {
        pilotChapterIds: audience.pilotChapterIds,
        passengerIds: audience.passengerIds,
      },
      new Date(now.getTime() - PAST_DAYS * DAY_MS),
      new Date(now.getTime() + FUTURE_DAYS * DAY_MS),
      now,
    ),
    calendarFeeds
      .recordFetch(feed.id, now)
      .catch((error) =>
        logger.warn(
          { err: serializeError(error), feed_id: feed.id },
          "calendar feed fetch not recorded",
        ),
      ),
  ]);

  const locale = resolveEmailLocale(feed.locale);
  const strings = getEmailStrings(locale).calendarFeed;

  return renderIcs({
    prodId: PROD_ID,
    name: strings.name,
    description: audience.named
      ? strings.descriptionCaretaker
      : strings.description,
    refreshMinutes: REFRESH_MINUTES,
    events: list.map((ride) => toEvent(ride, strings, audience, locale)),
  });
}
