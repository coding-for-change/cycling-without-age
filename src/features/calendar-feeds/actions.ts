"use server";

import { revalidatePath } from "next/cache";
import { calendarFeedUrl } from "@/lib/app-url";
import { requireAuth } from "@/lib/auth-guards";
import { actionFailure } from "@/lib/domain-error";
import { withinRateLimit } from "@/lib/rate-limit";
import { calendarFeeds, type CalendarFeed } from "./index";

export type CalendarFeedState = { url: string; lastFetchedAt: string | null };

export type CalendarFeedActionResult =
  | { ok: true; feed: CalendarFeedState | null }
  | { ok: false; error: "rateLimited" | "generic" };

const WRITE_LIMIT = { max: 10, windowMs: 60_000 };

async function changeFeed(
  write: (userId: string) => Promise<CalendarFeed | null>,
): Promise<CalendarFeedActionResult> {
  const session = await requireAuth();
  if (!withinRateLimit(`calendar-feed:${session.user.id}`, WRITE_LIMIT))
    return { ok: false, error: "rateLimited" };

  try {
    const feed = await write(session.user.id);
    revalidatePath("/", "layout");
    return {
      ok: true,
      feed: feed
        ? {
            url: calendarFeedUrl(feed.token),
            lastFetchedAt: feed.lastFetchedAt?.toISOString() ?? null,
          }
        : null,
    };
  } catch (error) {
    return actionFailure(error, {});
  }
}

export async function enableCalendarFeedAction() {
  return changeFeed(calendarFeeds.enableFeed);
}

export async function resetCalendarFeedAction() {
  return changeFeed(calendarFeeds.resetFeed);
}

export async function disableCalendarFeedAction() {
  return changeFeed(async (userId) => {
    await calendarFeeds.disableFeed(userId);
    return null;
  });
}
