import { z } from "zod";
import type { EmailStrings } from "@/emails/strings";
import { RIDE_MODELS, rides } from "@/features/rides";
import { calendarDate } from "@/lib/calendar";
import type { DomainEvent } from "@/lib/events/catalog";
import {
  formatLongDateWithWeekday,
  formatTimeRange,
  wordsLocale,
} from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";
import { chapterAdminIds, excluding } from "./lookups";

/**
 * What every ride message says about the ride: its name, when and where. The
 * instants travel as ISO strings with the chapter's zone, because the message
 * is written later, once per recipient, in their language — and the time must
 * read as the chapter's wall clock wherever the reader is.
 */
export const rideFacts = {
  rideTitle: z.string().nullable(),
  model: z.enum(RIDE_MODELS).nullable(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  timeZone: z.string().nullable(),
  place: z.string().nullable(),
  destination: z.string().nullable(),
  chapterName: z.string().nullable(),
  /** One message for both legs of a round trip. */
  bothWays: z.boolean(),
};

export type RideFacts = {
  [K in keyof typeof rideFacts]: z.infer<(typeof rideFacts)[K]>;
};

type Pair = Extract<DomainEvent, { type: "ride.cancelled" }>["pair"];

/**
 * The way there speaks for a round trip, so the way back's event is silent:
 * a family cancelling a trip to the doctor hears about it once.
 */
export const followsItsPair = (pair: Pair) => pair?.role === "follow";

export async function factsOfRide(
  rideId: string,
  pair: Pair = null,
): Promise<RideFacts> {
  const ride = await rides.getRideFacts(rideId);
  return {
    rideTitle: ride?.title ?? null,
    model: ride?.model ?? null,
    startsAt: ride?.startsAt.toISOString() ?? null,
    endsAt: ride?.endsAt.toISOString() ?? null,
    timeZone: ride?.chapter.timeZone ?? null,
    place: ride?.locationName ?? null,
    destination: ride?.destinationName ?? null,
    chapterName: ride?.chapter.name ?? null,
    bothWays: pair?.role === "lead",
  };
}

/** The words a message fills in about the ride, in the reader's language. */
export function rideWords(
  facts: RideFacts,
  strings: EmailStrings,
  locale: Locale,
) {
  const copy = strings.rideCommon;
  const notation = wordsLocale(locale);
  const known = facts.startsAt && facts.endsAt && facts.timeZone;
  return {
    ride:
      facts.rideTitle ?? (facts.model ? copy.models[facts.model] : copy.aRide),
    date: known
      ? formatLongDateWithWeekday(
          calendarDate(new Date(facts.startsAt!), facts.timeZone!),
          notation,
        )
      : copy.soon,
    time: known
      ? formatTimeRange(
          facts.startsAt!,
          facts.endsAt!,
          notation,
          facts.timeZone!,
        )
      : copy.timeToFollow,
    place: facts.place ?? facts.chapterName ?? copy.meetingPoint,
    destination: facts.destination ?? copy.theDestination,
    chapter: facts.chapterName ?? copy.theChapter,
  };
}

/**
 * Its pilots, the accounts behind its riders and, when asked, its admins. A
 * message that speaks for both legs reaches everyone on either.
 */
export async function rideAudience(
  rideId: string,
  pair: Pair,
  { admins, actorUserId }: { admins: boolean; actorUserId: string | null },
) {
  const legs = await Promise.all(
    [rideId, ...(pair?.role === "lead" ? [pair.otherRideId] : [])].map((id) =>
      rides.listRideParticipants(id),
    ),
  );
  const [ride] = legs;
  if (!ride) return [];
  const chapterAdmins = admins ? await chapterAdminIds(ride.chapterId) : [];
  return excluding(
    [
      ...new Set([
        ...legs.flatMap((leg) =>
          leg ? [...leg.pilotUserIds, ...leg.riderAccountUserIds] : [],
        ),
        ...chapterAdmins,
      ]),
    ],
    actorUserId,
  );
}
