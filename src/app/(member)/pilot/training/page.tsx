import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { chapters } from "@/features/chapters";
import { requireAuth } from "@/lib/auth-guards";
import { isTrainingRequired } from "@/lib/feature-flags";
import { formatDateMedium, resolveLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { ownReadiness } from "@/use-cases/pilot-readiness";
import { visibleCourses } from "@/use-cases/training-access";
import { MemberPageShell } from "../../_components/member-page";
import { CourseCard } from "./_components/course-card";
import { TRAINING_LIFE } from "./_components/format";
import { InPersonCard } from "./_components/in-person-card";
import { summarizeReadiness } from "./_components/readiness";
import { ReadinessHeader } from "./_components/readiness-header";
import { TrainingHomeSkeleton } from "./_components/skeletons";
import { TrainingSection } from "./_components/training-section";

export default function PilotTrainingPage() {
  return (
    <MemberPageShell wide>
      <Suspense fallback={<TrainingHomeSkeleton />}>
        <TrainingHome />
      </Suspense>
    </MemberPageShell>
  );
}

async function TrainingHome() {
  "use cache: private";
  cacheLife(TRAINING_LIFE);

  const session = await requireAuth();
  if (!isTrainingRequired()) notFound();
  const [dict, language, head] = await Promise.all([
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  const [{ context, courses }, own] = await Promise.all([
    visibleCourses(session.user.id, language),
    ownReadiness(session.user.id, language),
  ]);
  if (context.length === 0) redirect("/pilot");

  const notation = resolveLocale(head.get("accept-language"));
  const strings = dict.pilot.training;
  const summary = summarizeReadiness(own);
  const chapterRows = summary.chapters
    ? await chapters.getChapters(summary.chapters.map((c) => c.chapterId))
    : [];
  const chapterNames = new Map(chapterRows.map((row) => [row.id, row.name]));

  const byFamily = new Map(courses.map((course) => [course.familyId, course]));
  const requiredIds = new Set(
    summary.required.map((course) => course.familyId),
  );
  const required = summary.required.flatMap((status) => {
    const card = byFamily.get(status.familyId);
    return card ? [{ card, exempt: status.status === "exempt" }] : [];
  });
  const optional = courses.filter(
    (course) => !requiredIds.has(course.familyId),
  );

  return (
    <>
      <header className="grid gap-1">
        <h1 className="text-2xl tracking-tight md:text-3xl">{strings.title}</h1>
        <p className="text-sm text-ink-soft">{strings.intro}</p>
      </header>

      <ReadinessHeader
        summary={summary}
        chapterNames={chapterNames}
        strings={strings}
        language={language}
      />

      {required.length > 0 ? (
        <TrainingSection title={strings.sections.required}>
          {required.map(({ card, exempt }, index) => (
            <CourseCard
              key={card.familyId}
              course={card}
              strings={strings.card}
              language={language}
              notation={notation}
              priority={index < 2}
              exempt={exempt}
            />
          ))}
        </TrainingSection>
      ) : null}

      <TrainingSection
        title={strings.sections.inPerson}
        columns={1}
      >
        <InPersonCard
          confirmedOn={
            summary.inPersonConfirmedAt
              ? formatDateMedium(summary.inPersonConfirmedAt, notation)
              : null
          }
          strings={strings.inPerson}
          language={language}
        />
      </TrainingSection>

      {optional.length > 0 ? (
        <TrainingSection title={strings.sections.optional}>
          {optional.map((card, index) => (
            <CourseCard
              key={card.familyId}
              course={card}
              strings={strings.card}
              language={language}
              notation={notation}
              priority={required.length === 0 && index < 2}
            />
          ))}
        </TrainingSection>
      ) : null}

      {courses.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={strings.emptyTitle}
          className="justify-start rounded-none border-none pt-8"
        >
          {strings.empty}
        </EmptyState>
      ) : null}
    </>
  );
}
