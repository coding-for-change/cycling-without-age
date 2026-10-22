import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { trainingPlayerStrings } from "@/components/training-player-strings";
import { requireAuth } from "@/lib/auth-guards";
import { isTrainingRequired } from "@/lib/feature-flags";
import { resolveLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { fileUrl } from "@/lib/storage/file-url";
import { elementPage } from "@/use-cases/training-access";
import {
  TRAINING_LIFE,
  courseHref,
  elementHref,
} from "../../_components/format";
import { LessonView, type NextStep } from "../../_components/lesson-view";
import { LockedElement } from "../../_components/locked-element";
import { outlineOf } from "../../_components/outline";
import { PilotQuiz } from "../../_components/pilot-quiz";
import { LessonSkeleton } from "../../_components/skeletons";

type Params = Promise<{ courseId: string; elementId: string }>;

export default function ElementPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<LessonSkeleton />}>
      <Element params={params} />
    </Suspense>
  );
}

async function Element({ params }: { params: Params }) {
  const { courseId, elementId } = await params;
  return (
    <ElementBody
      courseId={courseId}
      elementId={elementId}
    />
  );
}

async function ElementBody({
  courseId,
  elementId,
}: {
  courseId: string;
  elementId: string;
}) {
  "use cache: private";
  cacheLife(TRAINING_LIFE);

  const session = await requireAuth();
  if (!isTrainingRequired()) notFound();
  const [page, dict, language, head] = await Promise.all([
    elementPage(session.user.id, courseId, elementId),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  if (!page) notFound();

  const notation = resolveLocale(head.get("accept-language"));
  const { card, element, index, previous, next, blocker } = page;
  const strings = dict.pilot.training;
  const nextStep: NextStep = next
    ? {
        href: elementHref(courseId, next.id),
        kind: next.kind,
        poster: next.poster,
      }
    : { href: courseHref(courseId), kind: "finish", poster: null };
  const blockerHref = blocker ? elementHref(courseId, blocker.id) : null;

  if (page.kind === "quiz")
    return (
      <div className="mx-auto grid w-full max-w-2xl px-4 pt-2 lg:px-0">
        <PilotQuiz
          key={element.id}
          courseId={courseId}
          elementId={element.id}
          initial={{ number: page.quiz.number, questions: page.quiz.questions }}
          locked={element.locked}
          lockedHref={blockerHref}
          passedAt={
            page.quiz.passedAt
              ? new Date(page.quiz.passedAt).toISOString()
              : null
          }
          notation={notation}
          continueHref={nextStep.href}
          final={next === null}
          strings={strings.quiz}
          language={language}
        />
      </div>
    );

  if (page.kind === "locked")
    return (
      <LockedElement
        title={element.title}
        href={blockerHref}
        strings={strings.lesson}
      />
    );

  const { lesson, progress } = page;
  return (
    <LessonView
      key={lesson.id}
      courseId={courseId}
      courseTitle={card.title}
      lesson={{
        id: lesson.id,
        title: lesson.title,
        body: lesson.body,
        attachmentHref: lesson.attachmentFileId
          ? fileUrl(lesson.attachmentFileId)
          : null,
        durationSeconds: lesson.durationSeconds,
        playback: lesson.playback,
      }}
      progress={
        progress
          ? {
              furthestSeconds: progress.furthestSeconds,
              positionSeconds: progress.positionSeconds,
              completed: progress.completed,
            }
          : null
      }
      index={index}
      total={card.elements.length}
      next={nextStep}
      previousHref={previous ? elementHref(courseId, previous.id) : null}
      outline={outlineOf(card, dict, language, notation)}
      strings={strings.lesson}
      player={trainingPlayerStrings(dict)}
      language={language}
    />
  );
}
