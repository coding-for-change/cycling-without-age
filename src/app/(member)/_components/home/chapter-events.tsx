import Link from "next/link";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { Armchair, Clock, MapPin } from "lucide-react";
import { Scene, type SceneName } from "@/components/art";
import { perspectiveViewerSession } from "@/lib/auth-guards";
import { calendarDate } from "@/lib/calendar";
import {
  formatDayOfMonth,
  formatLongDateWithWeekday,
  formatMonthAbbrev,
  formatTime,
  resolveLocale,
} from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import { passengerChapterNews } from "@/use-cases/passenger-rides";
import { MEMBER_LIFE } from "../instant";

const COVERS: SceneName[] = ["festival", "park", "lake", "rose", "cafe"];

/**
 * The events coming up in the passenger's chapters, as mockup 2's cover cards
 * in a row: when, where, how many seats are left. Read only until riders can
 * book themselves; an event one of their riders is on opens its ride page.
 */
export async function ChapterEvents() {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const session = await perspectiveViewerSession("passenger");
  if (!session) return null;
  const [{ events }, dict, language, head] = await Promise.all([
    passengerChapterNews(session.user.id),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  if (!events.length) return null;
  const s = dict.member.home.passenger.events;
  const notation = resolveLocale(head.get("accept-language"));

  return (
    <section className="reveal flex flex-col gap-3 [--i:6]">
      <h2 className="text-xl">{s.title}</h2>
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 lg:-mx-6 lg:px-6">
        {events.map((event, index) => {
          const day = calendarDate(event.startsAt, event.timeZone);
          const free =
            event.capacity === null
              ? null
              : Math.max(0, event.capacity - event.taken);
          const body = (
            <>
              <div className="relative">
                <Scene
                  name={COVERS[index % COVERS.length]}
                  className="aspect-5/3 w-full"
                />
                {free !== null ? (
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-paper/90 px-2.5 py-1 text-xs font-bold text-ink">
                    <Armchair
                      aria-hidden
                      className="size-3"
                    />
                    {free === 0
                      ? s.full
                      : formatMessage(
                          s.seats,
                          { free, total: event.capacity ?? 0 },
                          language,
                        )}
                  </span>
                ) : null}
                <span
                  aria-hidden
                  className="absolute top-3 right-3 flex flex-col items-center rounded-xl bg-paper px-2.5 py-1 leading-none text-ink shadow-soft"
                >
                  <span className="display-title text-xl">
                    {formatDayOfMonth(day, notation)}
                  </span>
                  <span className="text-xs font-bold uppercase">
                    {formatMonthAbbrev(day, notation)}
                  </span>
                </span>
              </div>
              <div className="flex flex-col gap-1.25 p-4">
                {event.mine ? (
                  <span className="w-fit rounded-full bg-mint-tint px-2.5 py-0.5 text-xs font-bold text-ink">
                    {s.mine}
                  </span>
                ) : null}
                <h3 className="truncate text-lg">{event.title}</h3>
                <p className="flex items-center gap-1.25 text-sm text-ink-soft">
                  <Clock
                    aria-hidden
                    className="size-3.5 shrink-0"
                  />
                  <span className="truncate">
                    {formatLongDateWithWeekday(day, notation)} ·{" "}
                    {formatTime(event.startsAt, notation, event.timeZone)}
                  </span>
                </p>
                {event.locationName ? (
                  <p className="flex items-center gap-1.25 text-sm text-ink-soft">
                    <MapPin
                      aria-hidden
                      className="size-3.5 shrink-0"
                    />
                    <span className="truncate">{event.locationName}</span>
                  </p>
                ) : null}
              </div>
            </>
          );
          const card =
            "block w-64 shrink-0 snap-start overflow-hidden rounded-soft border border-line bg-paper shadow-soft";
          return (
            <li key={event.id}>
              {event.mine ? (
                <Link
                  href={`/passenger/rides/${event.id}`}
                  transitionTypes={["push"]}
                  className={cn(
                    card,
                    "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  )}
                >
                  {body}
                </Link>
              ) : (
                <article className={card}>{body}</article>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
