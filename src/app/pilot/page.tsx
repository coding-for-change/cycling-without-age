import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  GraduationCap,
  MapPin,
  UserRound,
  XCircle,
} from "lucide-react";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { requirePerspective } from "@/lib/auth-guards";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import { resolveLocale } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { fill } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AccountDialog } from "@/components/account-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SignOutButton } from "@/components/sign-out-button";
import { ApprovalCelebration } from "./_components/approval-celebration";
import { PendingChapterCard } from "./_components/pending-chapter-card";

export default function PilotHomePage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Suspense fallback={<PilotHomeSkeleton />}>
        <PilotHome />
      </Suspense>
    </main>
  );
}

function PilotHomeSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-44 w-full rounded-xl" />
    </div>
  );
}

async function PilotHome() {
  const session = await requirePerspective("pilot");
  const [dict, head, memberships, applications] = await Promise.all([
    getDictionary(),
    headers(),
    membership.listMembershipsOfUser(session.user.id),
    membership.listApplicationsOfUser(session.user.id),
  ]);

  const pilotChapterIds = memberships
    .filter((m) => m.roles.includes("pilot"))
    .map((m) => m.chapterId);

  if (pilotChapterIds.length === 0 && applications.length === 0) {
    redirect("/onboarding");
  }

  const locale = resolveLocale(head.get("accept-language"));
  const { home, status } = dict.pilot;

  const pending = applications.filter((a) => a.status === "pending");
  const rejected = applications.filter(
    (a) => a.status === "rejected" && !pilotChapterIds.includes(a.chapterId),
  );
  const celebrate = applications.find(
    (a) => a.status === "approved" && a.approvalSeenAt === null,
  );

  const mine = (
    await Promise.all(pilotChapterIds.map((id) => chapters.getChapter(id)))
  ).filter((chapter) => chapter !== null);

  return (
    <>
      <h1 className="text-3xl tracking-tight">{home.title}</h1>

      {celebrate ? (
        <ApprovalCelebration
          title={home.celebration.title}
          body={fill(home.celebration.body, {
            chapter: celebrate.chapter.name,
          })}
          dismiss={home.celebration.dismiss}
        />
      ) : null}

      {mine.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
            {home.yourChapters}
          </h2>
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
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
      ) : null}

      {mine.length > 0 || pending.length > 0 ? (
        <Link
          href="/pilot/training"
          className="mt-6 flex items-center gap-4 rounded-xl bg-mint-tint p-4 transition-colors hover:bg-mint motion-reduce:transition-none"
        >
          <GraduationCap
            className="size-5 shrink-0 text-ink"
            aria-hidden
          />
          <span className="min-w-0">
            <span className="block font-medium">{home.training}</span>
            <span className="block text-sm text-ink-soft">
              {home.trainingHint}
            </span>
          </span>
          <ArrowRight
            className="ml-auto size-4 shrink-0 text-ink-soft"
            aria-hidden
          />
        </Link>
      ) : null}

      {pending.map((application) => (
        <PendingChapterCard
          key={application.id}
          chapterId={application.chapterId}
          chapterName={application.chapter.name}
          appliedAt={application.createdAt}
          locale={locale}
          strings={status}
        />
      ))}

      {rejected.map((application) => (
        <section
          key={application.id}
          className="mt-6 flex items-start gap-3 rounded-xl border border-line p-5"
        >
          <XCircle
            className="mt-0.5 size-5 shrink-0 text-ink-faint"
            aria-hidden
          />
          <div className="min-w-0">
            <h2 className="font-display font-bold">
              {fill(status.rejectedTitle, {
                chapter: application.chapter.name,
              })}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">{status.rejectedBody}</p>
            {application.decisionNote ? (
              <figure className="mt-3 rounded-lg bg-canvas-deep p-3">
                <figcaption className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
                  {status.note}
                </figcaption>
                <blockquote className="mt-1 text-sm whitespace-pre-wrap">
                  {application.decisionNote}
                </blockquote>
              </figure>
            ) : null}
          </div>
        </section>
      ))}

      {rejected.length > 0 ? (
        <Button
          asChild
          className="mt-6 min-h-11 bg-red text-white hover:bg-red-hover"
        >
          <Link href="/location?as=pilot">{status.applyElsewhere}</Link>
        </Button>
      ) : null}

      <footer className="mt-12 flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <AccountDialog
          strings={dict.account}
          locale={locale}
          profile={{
            name: session.user.name,
            email: session.user.email,
            avatar: avatarSvg(avatarSeed(session.user.email), true),
          }}
          trigger={
            <Button
              variant="outline"
              className="min-h-11 gap-2 rounded-full border-line"
            >
              <UserRound
                className="size-4"
                aria-hidden
              />
              {home.account}
            </Button>
          }
        />
        <SignOutButton label={dict.common.signOut} />
      </footer>
    </>
  );
}
