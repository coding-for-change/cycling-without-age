import Link from "next/link";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { TrishawIllustration } from "@/components/illustrations";
import { FileImage } from "@/features/fleet/components/file-image";
import { rides, type AnnouncedEventRow } from "@/features/rides";
import { EventPhotoTransition } from "@/features/rides/components/event-photo-transition";
import { perspectiveViewerSession } from "@/lib/auth-guards";
import { resolveLocale, wordsLocale, type Locale } from "@/lib/format";
import { readGuestChapterId } from "@/lib/guest-chapter";
import { getDictionary, getLocale, type Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { PERSPECTIVE_HOME } from "@/lib/redirects";
import { cn } from "@/lib/utils";
import { loadUpcomingEvents } from "../../passenger/rides/_components/upcoming-events";
import { pilotChapterIds } from "../../pilot/rides/_components/open-rides";
import { MEMBER_LIFE } from "../instant";
import { dayAndTime } from "./when";

type Perspective = "passenger" | "pilot";
type Viewer = Awaited<ReturnType<typeof perspectiveViewerSession>>;

async function eventsFor(viewer: Viewer, perspective: Perspective) {
  if (viewer && perspective === "pilot")
    return rides.listChapterEvents(pilotChapterIds(viewer.access));
  if (viewer) return loadUpcomingEvents(viewer.user.id);
  const chapterId = await readGuestChapterId();
  return chapterId ? rides.listChapterEvents([chapterId]) : [];
}

export async function HappeningSoon({
  perspective = "passenger",
}: {
  perspective?: Perspective;
}) {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const [session, dict, language, head] = await Promise.all([
    perspectiveViewerSession(perspective),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  const events = await eventsFor(session, perspective);
  if (!events.length) return null;

  const notation = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
        {dict.member.home.soon.title}
      </h2>
      <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2 scrollbar-none lg:-mx-6 lg:scroll-px-6 lg:px-6">
        {events.map((event) => (
          <li
            key={event.id}
            className="w-64 shrink-0 snap-start sm:w-72"
          >
            <EventCard
              event={event}
              perspective={perspective}
              guest={!session}
              dict={dict}
              notation={notation}
              words={words}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function EventCard({
  event,
  perspective,
  guest,
  dict,
  notation,
  words,
}: {
  event: AnnouncedEventRow;
  perspective: Perspective;
  guest: boolean;
  dict: Dictionary;
  notation: Locale;
  words: Locale;
}) {
  const strings = dict.passenger.rides.events;
  const title = event.title?.trim() || dict.calendar.models.event;
  const photo = event.photos[0]?.fileId ?? null;
  const left = rides.seatsLeft(event);
  const detail = `${PERSPECTIVE_HOME[perspective]}/rides/${event.id}`;
  const seats =
    left === null
      ? strings.open
      : formatMessage(strings.seatsLeft, { count: left }, words);

  return (
    <Link
      href={detail}
      prefetch={!guest}
      transitionTypes={["push"]}
      className="group flex h-full flex-col gap-3 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
    >
      <Cover
        id={event.id}
        photo={photo}
        title={title}
        morph
      />
      <span className="flex flex-col gap-1 px-1">
        <span className="line-clamp-2 font-display text-base leading-snug font-semibold text-balance">
          {title}
        </span>
        <span className="flex min-w-0 items-center gap-1.25 text-2sm text-ink-soft">
          <time
            dateTime={event.startsAt.toISOString()}
            className="shrink-0"
          >
            {dayAndTime(
              dict.member.home.soon.date,
              event.startsAt,
              event.chapter.timeZone,
              notation,
              words,
            )}
          </time>
          <span aria-hidden>·</span>
          <span
            className={cn(
              "truncate",
              left !== 0 && "font-medium text-mint-ink",
            )}
          >
            {seats}
          </span>
        </span>
      </span>
    </Link>
  );
}

function Cover({
  id,
  photo,
  title,
  morph,
}: {
  id: string;
  photo: string | null;
  title: string;
  morph: boolean;
}) {
  const cover = (
    <div className="aspect-4/3 w-full overflow-hidden rounded-2xl bg-mint-tint">
      {photo ? (
        <FileImage
          fileId={photo}
          alt={title}
          className="size-full transition-transform duration-500 group-hover:scale-103 motion-reduce:transition-none"
        />
      ) : (
        <span className="grid size-full place-items-center p-5">
          <TrishawIllustration className="w-3/4" />
        </span>
      )}
    </div>
  );
  if (!photo || !morph) return cover;
  return <EventPhotoTransition rideId={id}>{cover}</EventPhotoTransition>;
}
