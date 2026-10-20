"use server";

import { revalidatePath } from "next/cache";
import { id, quizAnswersInput, type QuizResult } from "@/features/training";
import { requireAuth } from "@/lib/auth-guards";
import { isTrainingRequired } from "@/lib/feature-flags";
import {
  createAttempt,
  type ActionResult,
  type DomainErrorCode,
} from "@/lib/domain-error";
import {
  acknowledgeLesson,
  startQuiz,
  submitQuiz,
} from "@/use-cases/training-access";

const MAPPED_ERRORS = [
  "elementKindMismatch",
  "quizAttemptClosed",
  "quizLocked",
  "unknownTrainingCourse",
  "unknownTrainingLesson",
] as const satisfies readonly DomainErrorCode[];

export type PilotTrainingError = (typeof MAPPED_ERRORS)[number] | "generic";

export type PilotTrainingResult<T extends object = object> = ActionResult<
  PilotTrainingError,
  T
>;

const INVALID = { ok: false, error: "generic" } as const;

const { attempt } = createAttempt(MAPPED_ERRORS, () =>
  revalidatePath("/pilot/training", "layout"),
);

export async function acknowledgeLessonAction(
  courseId: string,
  lessonId: string,
): Promise<PilotTrainingResult<{ completed: boolean }>> {
  const course = id.safeParse(courseId);
  const lesson = id.safeParse(lessonId);
  if (!isTrainingRequired() || !course.success || !lesson.success)
    return INVALID;
  const session = await requireAuth();
  return attempt(() =>
    acknowledgeLesson(session.user.id, course.data, lesson.data),
  );
}

export async function startQuizAction(
  courseId: string,
  elementId: string,
): Promise<PilotTrainingResult<{ number: number }>> {
  const course = id.safeParse(courseId);
  const element = id.safeParse(elementId);
  if (!isTrainingRequired() || !course.success || !element.success)
    return INVALID;
  const session = await requireAuth();
  return attempt(
    async () => {
      const { number } = await startQuiz(
        session.user.id,
        course.data,
        element.data,
      );
      return { number };
    },
    { revalidate: false },
  );
}

export async function submitQuizAction(
  courseId: string,
  elementId: string,
  answers: unknown,
): Promise<PilotTrainingResult<{ result: QuizResult }>> {
  const course = id.safeParse(courseId);
  const element = id.safeParse(elementId);
  const parsed = quizAnswersInput.safeParse(answers);
  if (
    !isTrainingRequired() ||
    !course.success ||
    !element.success ||
    !parsed.success
  )
    return INVALID;
  const session = await requireAuth();
  return attempt(async () => ({
    result: await submitQuiz(
      session.user.id,
      course.data,
      element.data,
      parsed.data,
    ),
  }));
}
