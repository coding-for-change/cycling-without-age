import { createHash } from "node:crypto";
import { connection } from "next/server";
import { calendarFeeds, feedFileName } from "@/features/calendar-feeds";
import { web } from "@/lib/observability/metrics";
import { withinRateLimit } from "@/lib/rate-limit";
import { renderCalendarFeed } from "@/use-cases/calendar-feed";

const POLL_LIMIT = { max: 60, windowMs: 10 * 60_000 };

/**
 * The address is the credential, so nothing about it may be cached by a
 * shared proxy, leak as a referrer, or be indexed if it is ever pasted
 * somewhere public.
 */
const PRIVATE = {
  "Cache-Control": "private, no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};

const notFound = () => {
  web.calendarFeedPolls.inc({ outcome: "not_found" });
  return new Response("Not found", { status: 404, headers: PRIVATE });
};

const matches = (header: string | null, etag: string) =>
  header
    ?.split(",")
    .map((tag) => tag.trim().replace(/^W\//, ""))
    .some((tag) => tag === etag || tag === "*") ?? false;

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/calendar/[file]">,
) {
  await connection();

  const parsed = feedFileName.safeParse((await ctx.params).file);
  if (!parsed.success) return notFound();
  const token = parsed.data;

  // A forged address never reaches the limiter: it would otherwise let anyone
  // mint a fresh bucket per request.
  const key = calendarFeeds.feedKeyOf(token);
  if (!key) return notFound();

  if (!withinRateLimit(`calendar-feed-poll:${key}`, POLL_LIMIT)) {
    web.calendarFeedPolls.inc({ outcome: "rate_limited" });
    return new Response("Too many requests", {
      status: 429,
      headers: { ...PRIVATE, "Retry-After": "600" },
    });
  }

  const body = await renderCalendarFeed(token);
  if (body === null) return notFound();

  const etag = `"${createHash("sha256").update(body).digest("base64url")}"`;
  if (matches(request.headers.get("if-none-match"), etag)) {
    web.calendarFeedPolls.inc({ outcome: "not_modified" });
    return new Response(null, {
      status: 304,
      headers: { ...PRIVATE, ETag: etag },
    });
  }

  web.calendarFeedPolls.inc({ outcome: "served" });
  return new Response(body, {
    headers: {
      ...PRIVATE,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="cycling-without-age.ics"',
      ETag: etag,
    },
  });
}
