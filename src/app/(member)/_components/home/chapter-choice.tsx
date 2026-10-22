import Link from "next/link";
import { MapPin } from "lucide-react";
import { cacheLife } from "next/cache";
import { Button } from "@/components/ui/button";
import { chapters } from "@/features/chapters";
import { perspectiveViewerSession } from "@/lib/auth-guards";
import { readGuestChapterId } from "@/lib/guest-chapter";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { getMemberHome } from "@/use-cases/member-home";
import { MEMBER_LIFE } from "../instant";

export async function ChapterChoice() {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const [session, dict, locale] = await Promise.all([
    perspectiveViewerSession("passenger"),
    getDictionary(),
    getLocale(),
  ]);
  if (session) {
    const home = await getMemberHome(session.user.id);
    if (home.chapters.length > 0 || home.applications.length > 0) return null;
  }

  const guestChapterId = await readGuestChapterId();
  const chapter = guestChapterId
    ? await chapters.getChapter(guestChapterId)
    : null;

  return (
    <section className="flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-canvas px-4 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-mint-tint text-mint-ink">
        <MapPin
          aria-hidden
          className="size-5"
        />
      </span>
      <p className="min-w-0 flex-1 text-sm font-medium">
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
        className="min-h-11 shrink-0 rounded-full border-line"
      >
        <Link href="/location?as=passenger">
          {dict.member.home.passenger.chooseChapter}
        </Link>
      </Button>
    </section>
  );
}
