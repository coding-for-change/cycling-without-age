import { CalendarHeart, ChevronDown } from "lucide-react";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { EmptyState } from "@/components/empty-state";
import { chapters } from "@/features/chapters";
import { passengers } from "@/features/passengers";
import { rides } from "@/features/rides";
import { RideAgenda } from "@/features/rides/components/ride-agenda";
import { requirePerspective } from "@/lib/auth-guards";
import { resolveLocale, wordsLocale, type Locale } from "@/lib/format";
import { getDictionary, getLocale, type Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { MEMBER_LIFE } from "../../../_components/instant";
import { ChapterMail } from "./chapter-mail";

const rideHref = (rideId: string) => `/passenger/rides/${rideId}`;

export async function PassengerRides() {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const session = await requirePerspective("passenger");
  const [mine, dict, language, head] = await Promise.all([
    passengers.listPassengersManagedBy(session.user.id),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  const { upcoming, past } = await rides.listPassengerRides(
    mine.map((passenger) => passenger.id),
  );

  const locale = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);
  const strings = dict.passenger.rides;

  return (
    <>
      <h1 className="text-2xl tracking-tight md:text-3xl">
        {dict.member.pages.rides.title}
      </h1>

      {upcoming.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
            {dict.calendar.upcoming}
          </h2>
          <RideAgenda
            rides={upcoming}
            strings={dict.calendar}
            locale={locale}
            words={words}
            href={rideHref}
          />
        </section>
      ) : (
        <AskForRide
          chapterIds={[
            ...new Set(mine.map((passenger) => passenger.chapterId)),
          ]}
          dict={dict}
          words={words}
        />
      )}

      {past.length ? (
        <details className="group flex flex-col">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none [&::-webkit-details-marker]:hidden">
            <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
              {strings.past}
            </h2>
            <span className="text-2sm flex items-center gap-1.25 text-ink-soft">
              {formatMessage(strings.pastCount, { count: past.length }, words)}
              <ChevronDown
                aria-hidden
                className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none"
              />
            </span>
          </summary>
          <div className="pt-3">
            <RideAgenda
              rides={past}
              strings={dict.calendar}
              locale={locale}
              words={words}
              href={rideHref}
            />
          </div>
        </details>
      ) : null}
    </>
  );
}

/**
 * Until riders can book in the app, the honest next step is the chapter's own
 * inbox. A chapter that has not set one gets the general copy instead.
 */
async function AskForRide({
  chapterIds,
  dict,
  words,
}: {
  chapterIds: string[];
  dict: Dictionary;
  words: Locale;
}) {
  const [found, settings] = await Promise.all([
    chapters.getChapters(chapterIds),
    Promise.all(chapterIds.map((id) => chapters.getSettings(id))),
  ]);
  const reachable = chapterIds.flatMap((id, index) => {
    const chapter = found.find((row) => row.id === id);
    const email = settings[index].replyToEmail?.trim();
    return chapter && email ? [{ id, name: chapter.name, email }] : [];
  });
  const strings = dict.passenger.rides;

  if (!reachable.length)
    return (
      <EmptyState
        icon={CalendarHeart}
        className="flex-1 justify-start rounded-none border-none pt-16"
      >
        {dict.member.pages.rides.passenger.body}
      </EmptyState>
    );

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
        {strings.empty.title}
      </h2>
      {reachable.map((chapter) => (
        <EmptyState
          key={chapter.id}
          icon={CalendarHeart}
          title={formatMessage(
            strings.empty.ask,
            { chapter: chapter.name },
            words,
          )}
          action={
            <ChapterMail
              email={chapter.email}
              subject={strings.empty.subject}
              label={strings.write}
            />
          }
        >
          {strings.empty.askBody}
        </EmptyState>
      ))}
    </section>
  );
}
