import {
  feedToken,
  newFeedKey,
  verifyFeedToken,
} from "@/lib/crypto/feed-signature";
import { isUniqueViolation } from "@/lib/domain-error";
import { logDomainEvent } from "@/lib/observability/logger";
import {
  deleteFeedOfUser,
  findFeedByKey,
  findFeedOfUser,
  insertFeed,
  replaceFeedKey,
  touchFeed,
  type CalendarFeedRow,
} from "./services/calendar-feeds";

export type CalendarFeed = {
  token: string;
  lastFetchedAt: Date | null;
  createdAt: Date;
};

export type OpenedFeed = { id: string; userId: string; locale: string | null };

/**
 * A calendar app polls on its own schedule — every few minutes on some phones
 * — so "last checked" is written at most this often, not on every poll.
 */
const TOUCH_EVERY_MS = 15 * 60_000;

const view = ({ key, lastFetchedAt, createdAt }: CalendarFeedRow) => ({
  token: feedToken(key),
  lastFetchedAt,
  createdAt,
});

const isBanned = (
  user: { banned: boolean | null; banExpires: Date | null },
  now: Date,
) => Boolean(user.banned) && (!user.banExpires || user.banExpires > now);

export async function getFeed(userId: string): Promise<CalendarFeed | null> {
  const row = await findFeedOfUser(userId);
  return row ? view(row) : null;
}

/** Idempotent: asking twice returns the address already handed out. */
export async function enableFeed(userId: string): Promise<CalendarFeed> {
  const existing = await findFeedOfUser(userId);
  if (existing) return view(existing);

  try {
    const row = await insertFeed(userId, newFeedKey());
    logDomainEvent({ type: "calendarFeed.enabled", actorUserId: userId });
    return view(row);
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const raced = await findFeedOfUser(userId);
    if (!raced) throw error;
    return view(raced);
  }
}

/** A new key is a new address; the old one is dead on its next poll. */
export async function resetFeed(userId: string): Promise<CalendarFeed> {
  const row = await replaceFeedKey(userId, newFeedKey());
  logDomainEvent({ type: "calendarFeed.reset", actorUserId: userId });
  return view(row);
}

export async function disableFeed(userId: string): Promise<void> {
  const { count } = await deleteFeedOfUser(userId);
  if (count)
    logDomainEvent({ type: "calendarFeed.disabled", actorUserId: userId });
}

/**
 * The key a genuine address was signed for, or `null`. Pure: no row is read,
 * which is what lets the route reject a forged address before it spends a
 * rate-limit bucket on it.
 */
export const feedKeyOf = (token: string) => verifyFeedToken(token);

/**
 * The signature is checked before the table is read, so a forged or
 * mistyped address costs one HMAC and no query.
 */
export async function openFeed(
  token: string,
  now = new Date(),
): Promise<OpenedFeed | null> {
  const key = verifyFeedToken(token);
  if (!key) return null;

  const row = await findFeedByKey(key);
  if (!row || isBanned(row.user, now)) return null;
  return { id: row.id, userId: row.userId, locale: row.user.locale };
}

export async function recordFetch(feedId: string, now = new Date()) {
  await touchFeed(feedId, now, new Date(now.getTime() - TOUCH_EVERY_MS));
}
