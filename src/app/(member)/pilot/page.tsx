import { Suspense } from "react";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requirePerspective } from "@/lib/auth-guards";
import { resolveLocale } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { fill } from "@/lib/utils";
import { getMemberHome } from "@/use-cases/member-home";
import { ChapterCards } from "../_components/home/chapter-cards";
import { Greeting } from "../_components/home/greeting";
import {
  GreetingFallback,
  SectionFallback,
} from "../_components/home/home-fallback";
import { NextRideCard } from "../_components/home/next-ride-card";
import { MEMBER_LIFE } from "../_components/instant";
import { MemberPageShell } from "../_components/member-page";
import { ApprovalCelebration } from "./_components/approval-celebration";
import { PendingChapterCard } from "./_components/pending-chapter-card";
import { RejectedCard } from "./_components/rejected-card";

export default function PilotHomePage() {
  return (
    <MemberPageShell>
      <Suspense fallback={<GreetingFallback />}>
        <Greeting perspective="pilot" />
      </Suspense>
      <Suspense fallback={null}>
        <PilotStatus />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <NextRideCard perspective="pilot" />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <ChapterCards perspective="pilot" />
      </Suspense>
      <Suspense fallback={null}>
        <TrainingLink />
      </Suspense>
    </MemberPageShell>
  );
}

async function PilotStatus() {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const session = await requirePerspective("pilot");
  const [dict, head, home] = await Promise.all([
    getDictionary(),
    headers(),
    getMemberHome(session.user.id),
  ]);

  const pilotChapterIds = home.memberships
    .filter((member) => member.roles.includes("pilot"))
    .map((member) => member.chapterId);

  if (pilotChapterIds.length === 0 && home.applications.length === 0)
    redirect("/onboarding");

  const locale = resolveLocale(head.get("accept-language"));
  const { celebration } = dict.pilot.home;
  const status = dict.pilot.status;

  const pending = home.applications.filter((a) => a.status === "pending");
  const rejected = home.applications.filter(
    (a) => a.status === "rejected" && !pilotChapterIds.includes(a.chapterId),
  );
  const celebrate = home.applications.find(
    (a) => a.status === "approved" && a.approvalSeenAt === null,
  );

  return (
    <>
      {celebrate ? (
        <ApprovalCelebration
          title={celebration.title}
          body={fill(celebration.body, { chapter: celebrate.chapter.name })}
          dismiss={celebration.dismiss}
        />
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
        <RejectedCard
          key={application.id}
          chapterName={application.chapter.name}
          note={application.decisionNote}
          strings={status}
        />
      ))}

      {rejected.length > 0 ? (
        <Button
          asChild
          variant="outline"
          className="min-h-11 rounded-full border-line"
        >
          <Link href="/location?as=pilot">{status.applyElsewhere}</Link>
        </Button>
      ) : null}
    </>
  );
}

async function TrainingLink() {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const session = await requirePerspective("pilot");
  const [dict, home] = await Promise.all([
    getDictionary(),
    getMemberHome(session.user.id),
  ]);

  const riding =
    home.memberships.some((member) => member.roles.includes("pilot")) ||
    home.applications.some((application) => application.status === "pending");
  if (!riding) return null;

  const { training, trainingHint } = dict.pilot.home;

  return (
    <Link
      href="/pilot/training"
      className="flex items-center gap-4 rounded-2xl bg-mint-tint p-4 transition-colors hover:bg-mint motion-reduce:transition-none"
    >
      <GraduationCap
        className="size-5 shrink-0 text-ink"
        aria-hidden
      />
      <span className="min-w-0">
        <span className="block font-medium">{training}</span>
        <span className="block text-sm text-ink-soft">{trainingHint}</span>
      </span>
      <ArrowRight
        className="ml-auto size-4 shrink-0 text-ink-soft"
        aria-hidden
      />
    </Link>
  );
}
