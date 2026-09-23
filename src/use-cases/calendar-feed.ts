import {
  getEmailStrings,
  resolveEmailLocale,
  type EmailStrings,
} from "@/emails/strings";
import { calendarFeeds } from "@/features/calendar-feeds";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { rides } from "@/features/rides";
import { APP_URL } from "@/lib/app-url";
import { renderIcs, type IcsEvent } from "@/lib/ics";
import { serializeError } from "@/lib/observability/errors";
import { logger } from "@/lib/observability/logger";
import { fill } from "@/lib/utils";

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
 * `/pilot`'s own rule: the pilot role somewhere lets a member in, and only the
 * chapters they still belong to are theirs to read. A demoted or departed pilot
 * keeps their `RideAssignment` rows, so this — not the assignment — decides.
 */
async function audienceOf(userId: string): Promise<rides.FeedAudience> {
  const [memberships, managed] = await Promise.all([
    membership.listMembershipsOfUser(userId),
    passengers.listPassengersManagedBy(userId),
  ]);
  const pilots = memberships.some(({ roles }) => roles.includes("pilot"));
  return {
    pilotChapterIds: pilots
      ? memberships.map(({ chapterId }) => chapterId)
      : [],
    passengerIds: managed.map(({ id }) => id),
  };
}

function toEvent(
  ride: rides.RideFeedRow,
  strings: FeedStrings,
  pilotChapterIds: string[],
): IcsEvent {
  const piloting =
    ride.assignments.length > 0 && pilotChapterIds.includes(ride.chapterId);
  const model = strings.models[ride.model];
  const title = piloting ? fill(strings.pilot, { model }) : model;
  const cancelled = ride.status === "cancelled";
  const destination = place(ride.destinationName, ride.destinationAddress);
  const trishaws = ride.trishaws.map(({ trishaw }) => trishaw.name);
  const href = `${APP_URL}/${piloting ? "pilot" : "passenger"}`;

  return {
    uid: `ride-${ride.id}@${UID_HOST}`,
    start: ride.startsAt,
    end: ride.endsAt,
    stamp: ride.updatedAt,
    summary: cancelled ? fill(strings.cancelled, { title }) : title,
    location: place(ride.locationName, ride.locationAddress),
    description: [
      ride.chapter.name,
      destination && fill(strings.destination, { place: destination }),
      trishaws.length > 0 &&
        fill(strings.trishaws, { names: trishaws.join(", ") }),
      fill(strings.details, { url: href }),
    ]
      .filter(Boolean)
      .join("\n"),
    url: href,
    status: cancelled ? "CANCELLED" : "CONFIRMED",
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
      audience,
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

  const strings = getEmailStrings(resolveEmailLocale(feed.locale)).calendarFeed;

  return renderIcs({
    prodId: PROD_ID,
    name: strings.name,
    description: strings.description,
    refreshMinutes: REFRESH_MINUTES,
    events: list.map((ride) =>
      toEvent(ride, strings, audience.pilotChapterIds),
    ),
  });
}
