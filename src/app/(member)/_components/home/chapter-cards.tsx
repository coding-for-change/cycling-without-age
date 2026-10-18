import Link from "next/link";
import { cn } from "@/lib/utils";
import { Bike, MapPin } from "lucide-react";
import { chapters } from "@/features/chapters";
import { rides } from "@/features/rides";
import { Button } from "@/components/ui/button";
import { perspectiveViewerSession } from "@/lib/auth-guards";
import { readGuestChapterId } from "@/lib/guest-chapter";
import { cacheLife } from "next/cache";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { getMemberHome } from "@/use-cases/member-home";
import type { MemberPerspective } from "../../nav";
import { MEMBER_LIFE } from "../instant";

export async function ChapterCards({
  perspective,
}: {
  perspective: MemberPerspective;
}) {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const [session, dict, locale] = await Promise.all([
    perspectiveViewerSession(perspective),
    getDictionary(),
    getLocale(),
  ]);
  const home = session ? await getMemberHome(session.user.id) : null;

  const mine = home?.chapters ?? [];

  const pulses =
    perspective === "passenger"
      ? await Promise.all(
          mine.map((chapter) => rides.chapterRidesThisMonth(chapter)),
        )
      : [];

  const heading =
    mine.length > 1
      ? dict.member.home.yourChapters
      : dict.member.home.yourChapter;

  if (mine.length > 0)
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
          {heading}
        </h2>
        <ul
          className={cn(
            "divide-y divide-line",
            perspective === "passenger"
              ? "reveal rounded-soft border border-line bg-paper shadow-soft [--i:5]"
              : "rounded-2xl border border-line",
          )}
        >
          {mine.map((chapter, index) => (
            <li
              key={chapter.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              {perspective === "passenger" ? (
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-mint-tint">
                  <MapPin
                    className="size-5"
                    aria-hidden
                  />
                </span>
              ) : (
                <MapPin
                  className="size-4 text-mint-ink"
                  aria-hidden
                />
              )}
              <span className="flex min-w-0 flex-1 flex-col gap-1.25">
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-medium">{chapter.name}</span>
                  <span className="text-sm text-ink-soft">
                    {chapter.careHomeName ?? chapter.city}
                  </span>
                </span>
                {pulses[index] ? (
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-mint-tint px-2.5 py-0.5 text-xs font-bold text-ink">
                    <Bike
                      aria-hidden
                      className="size-3"
                    />
                    {formatMessage(
                      dict.member.home.passenger.pulse,
                      { count: pulses[index] },
                      locale,
                    )}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </section>
    );

  if ((home?.applications.length ?? 0) > 0) return null;

  const guestChapterId = await readGuestChapterId();
  const chapter = guestChapterId
    ? await chapters.getChapter(guestChapterId)
    : null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
        {heading}
      </h2>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
        <p className="min-w-0">
          {chapter
            ? formatMessage(
                dict.passenger.browsing,
                { chapter: chapter.name },
                locale,
              )
            : dict.passenger.noChapter}
        </p>
        <Button
          asChild
          variant="outline"
          className="min-h-11 rounded-full border-line"
        >
          <Link href={`/location?as=${perspective}`}>
            {dict.member.home.passenger.chooseChapter}
          </Link>
        </Button>
      </div>
    </section>
  );
}
