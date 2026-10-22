import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { requireAuth } from "@/lib/auth-guards";
import { isTrainingRequired } from "@/lib/feature-flags";
import { ViewerDate } from "@/components/viewer-date";
import { resolveLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { courseOverview } from "@/use-cases/training-access";
import { MemberPageShell } from "../../../_components/member-page";
import { MemberTitle } from "../../../_components/member-title";
import { CoursePoster } from "../_components/course-poster";
import { TRAINING_LIFE, courseMeta, elementHref } from "../_components/format";
import { LessonOutline } from "../_components/lesson-outline";
import { outlineOf } from "../_components/outline";
import { CourseOverviewSkeleton } from "../_components/skeletons";
import { StartButton } from "../_components/start-button";

type Params = Promise<{ courseId: string }>;

export default function CourseOverviewPage({ params }: { params: Params }) {
  return (
    <MemberPageShell wide>
      <Suspense fallback={<CourseOverviewSkeleton />}>
        <Overview params={params} />
      </Suspense>
    </MemberPageShell>
  );
}

async function Overview({ params }: { params: Params }) {
  const { courseId } = await params;
  return <OverviewBody courseId={courseId} />;
}

async function OverviewBody({ courseId }: { courseId: string }) {
  "use cache: private";
  cacheLife(TRAINING_LIFE);

  const session = await requireAuth();
  if (!isTrainingRequired()) notFound();
  const [card, dict, language, head] = await Promise.all([
    courseOverview(session.user.id, courseId),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  if (!card) notFound();

  const notation = resolveLocale(head.get("accept-language"));
  const strings = dict.pilot.training;
  const outline = outlineOf(card, dict, language, notation);
  const { progress } = card;
  const passed = progress.passedAt !== null;
  const started = progress.completedElements > 0 || progress.startedAt !== null;
  const first = card.elements[0];

  const action =
    progress.nextElementId && !passed
      ? {
          href: elementHref(courseId, progress.nextElementId),
          label:
            progress.nextElementKind === "quiz"
              ? strings.course.takeQuiz
              : started
                ? strings.course.resume
                : strings.course.start,
        }
      : first
        ? {
            href: elementHref(courseId, first.id),
            label: strings.course.watchAgain,
          }
        : null;

  return (
    <>
      <MemberTitle title={card.title} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10">
        <div className="grid gap-6">
          <div className="relative">
            <CoursePoster
              courseId={courseId}
              src={
                card.elements.find((element) => element.posterLarge)
                  ?.posterLarge ?? null
              }
              priority
              className="rounded-(--r-tile)"
            />
            {passed ? (
              <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-mint-deep px-3 py-1.5 text-sm font-medium text-white">
                <Check
                  className="size-4"
                  strokeWidth={3}
                  aria-hidden
                />
                <ViewerDate
                  value={new Date(progress.passedAt!).toISOString()}
                  notation={notation}
                  template={strings.course.passedOn}
                  language={language}
                />
              </span>
            ) : null}
          </div>

          <div className="grid gap-2">
            <h1 className="text-2xl tracking-tight md:text-3xl">
              {card.title}
            </h1>
            <p className="text-sm text-ink-soft">
              {courseMeta(
                card.lessonCount,
                card.durationSeconds,
                strings.card.lessons,
                language,
                notation,
              )}
            </p>
            {card.summary ? (
              <p className="text-base whitespace-pre-line">{card.summary}</p>
            ) : null}
          </div>

          {action ? (
            <StartButton
              href={action.href}
              label={action.label}
              className="w-full sm:w-fit"
            />
          ) : null}
        </div>

        <section className="grid gap-2 lg:sticky lg:top-4 lg:rounded-(--r-tile) lg:border lg:border-line lg:p-4">
          <h2 className="text-lg tracking-tight">{strings.course.outline}</h2>
          <LessonOutline
            {...outline}
            activeId={null}
            className="-mx-3 lg:mx-0"
          />
        </section>
      </div>
    </>
  );
}
