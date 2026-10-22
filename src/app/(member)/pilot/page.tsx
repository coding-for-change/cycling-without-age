import { Suspense } from "react";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requirePerspective } from "@/lib/auth-guards";
import { isTrainingRequired } from "@/lib/feature-flags";
import { resolveLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { getMemberHome } from "@/use-cases/member-home";
import { Greeting } from "../_components/home/greeting";
import { GreetingFallback } from "../_components/home/home-fallback";
import { MEMBER_LIFE } from "../_components/instant";
import { MemberPageShell } from "../_components/member-page";
import { ApprovalCelebration } from "./_components/approval-celebration";
import {
  NeedsPilotCarousel,
  NeedsPilotCarouselFallback,
} from "./_components/needs-pilot-carousel";
import { PendingChapterCard } from "./_components/pending-chapter-card";
import {
  PilotHero,
  PilotHeroFallback,
  PilotSetupRow,
} from "./_components/pilot-hero";
import { RejectedCard } from "./_components/rejected-card";

export default function PilotHomePage() {
  return (
    <MemberPageShell>
      <Suspense fallback={<GreetingFallback hero />}>
        <Greeting
          perspective="pilot"
          hero
        />
      </Suspense>
      <Suspense fallback={null}>
        <PilotStatus />
      </Suspense>
      <Suspense fallback={<PilotHeroFallback />}>
        <PilotHero />
      </Suspense>
      <Suspense fallback={<NeedsPilotCarouselFallback />}>
        <NeedsPilotCarousel />
      </Suspense>
      <Suspense fallback={null}>
        <PilotSetupRow />
      </Suspense>
    </MemberPageShell>
  );
}

async function PilotStatus() {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const session = await requirePerspective("pilot");
  const [dict, language, head, home] = await Promise.all([
    getDictionary(),
    getLocale(),
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
          body={formatMessage(
            isTrainingRequired() ? celebration.body : celebration.bodyInPerson,
            { chapter: celebrate.chapter.name },
            language,
          )}
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
          language={language}
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
