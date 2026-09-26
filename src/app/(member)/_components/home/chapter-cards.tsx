import Link from "next/link";
import { MapPin } from "lucide-react";
import { chapters } from "@/features/chapters";
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
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {mine.map((chapter) => (
            <li
              key={chapter.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3"
            >
              <MapPin
                className="size-4 text-mint-deep"
                aria-hidden
              />
              <span className="font-medium">{chapter.name}</span>
              <span className="text-sm text-ink-soft">
                {chapter.careHomeName ?? chapter.city}
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
