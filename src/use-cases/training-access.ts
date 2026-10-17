import { cache } from "react";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import {
  elementGates,
  nextOpenElement,
  percentComplete,
  training,
  type ChapterContext,
  type CourseOutlineElement,
  type HeartbeatInput,
  type LessonProgressView,
  type QuizAnswers,
} from "@/features/training";
import { pickVariant } from "@/features/training/requirements";
import { allowsAdmin, hasAnyAdminScope, type Access } from "@/lib/access";
import { DomainError } from "@/lib/domain-error";

export type TrainingChapter = ChapterContext & {
  status: "pilot" | "applicant";
};

async function trainingChapters(userId: string) {
  const [memberships, applications] = await Promise.all([
    membership.listMembershipsOfUser(userId),
    membership.listApplicationsOfUser(userId),
  ]);
  const pilotIds = memberships
    .filter((m) => m.roles.includes("pilot"))
    .map((m) => m.chapterId);
  const applicantIds = applications
    .filter((application) => application.status === "pending")
    .map((application) => application.chapterId)
    .filter((chapterId) => !pilotIds.includes(chapterId));
  return { pilotIds, ids: [...new Set([...pilotIds, ...applicantIds])] };
}

export const trainingChapterIdsOf = async (userId: string) =>
  (await trainingChapters(userId)).ids;

export const trainingContext = cache(
  async (userId: string): Promise<TrainingChapter[]> => {
    const { pilotIds, ids } = await trainingChapters(userId);
    const countries = await chapters.getChapterCountryIds(ids);
    return ids.flatMap((chapterId) => {
      const countryId = countries.get(chapterId);
      if (!countryId) return [];
      return [
        {
          chapterId,
          countryId,
          status: pilotIds.includes(chapterId) ? "pilot" : "applicant",
        } satisfies TrainingChapter,
      ];
    });
  },
);

const searchOf = (context: ChapterContext[]) => ({
  countryIds: [...new Set(context.map((chapter) => chapter.countryId))],
  chapterIds: context.map((chapter) => chapter.chapterId),
});

type PublishedCourse = Awaited<
  ReturnType<typeof training.publishedCourses>
>[number];

const chapterFor = (
  course: PublishedCourse,
  context: TrainingChapter[],
): TrainingChapter | null =>
  context.find((chapter) =>
    training.familyVisibleToChapter(course.family, chapter),
  ) ?? null;

export type CourseProgress = {
  completedElements: number;
  totalElements: number;
  percent: number;
  startedAt: Date | null;
  passedAt: Date | null;
  attempts: number;
  nextElementId: string | null;
  nextElementKind: OutlineElement["kind"] | null;
};

export type OutlineElement = CourseOutlineElement & {
  progress: LessonProgressView | null;
  completed: boolean;
  locked: boolean;
};

export type CourseCard = {
  familyId: string;
  courseId: string;
  chapterId: string;
  language: string;
  title: string;
  summary: string | null;
  variants: { courseId: string; language: string; title: string }[];
  elements: OutlineElement[];
  lessonCount: number;
  quizCount: number;
  durationSeconds: number;
  poster: string | null;
  progress: CourseProgress;
};

function progressOfCourse(
  elements: OutlineElement[],
  enrollment: {
    startedAt: Date;
    passedAt: Date | null;
    attemptCount: number;
  } | null,
): CourseProgress {
  const next = nextOpenElement(elements);
  return {
    completedElements: elements.filter((element) => element.completed).length,
    totalElements: elements.length,
    percent: enrollment?.passedAt ? 100 : percentComplete(elements),
    startedAt: enrollment?.startedAt ?? null,
    passedAt: enrollment?.passedAt ?? null,
    attempts: enrollment?.attemptCount ?? 0,
    nextElementId: next?.id ?? null,
    nextElementKind: next?.kind ?? null,
  };
}

async function buildCards(
  userId: string,
  picks: {
    course: PublishedCourse;
    chapter: TrainingChapter;
    variants: PublishedCourse[];
  }[],
): Promise<CourseCard[]> {
  const outlines = await training.outlinesFor(
    picks.map(({ course }) => course.id),
  );
  const elementIds = [...outlines.values()].flat().map((element) => element.id);
  const [progress, enrollments] = await Promise.all([
    training.progressOf(userId, elementIds),
    training.enrollmentsOf(
      userId,
      picks.map(({ course }) => course.id),
    ),
  ]);

  return picks.map(({ course, chapter, variants }) => {
    const elements = elementGates(
      (outlines.get(course.id) ?? []).map((element) => {
        const own = progress.get(element.id) ?? null;
        return {
          ...element,
          progress: own,
          completed: own?.completed ?? false,
        };
      }),
    );
    return {
      familyId: course.familyId,
      courseId: course.id,
      chapterId: chapter.chapterId,
      language: course.language,
      title: course.title,
      summary: course.summary,
      variants: variants.map((variant) => ({
        courseId: variant.id,
        language: variant.language,
        title: variant.title,
      })),
      elements,
      lessonCount: elements.filter((element) => element.kind === "lesson")
        .length,
      quizCount: elements.filter((element) => element.kind === "quiz").length,
      durationSeconds: elements.reduce(
        (sum, element) => sum + (element.durationSeconds ?? 0),
        0,
      ),
      poster: elements.find((element) => element.poster)?.poster ?? null,
      progress: progressOfCourse(elements, enrollments.get(course.id) ?? null),
    };
  });
}

export async function visibleCourses(userId: string, locale: string) {
  const context = await trainingContext(userId);
  if (context.length === 0) return { context, courses: [] };
  const published = await training.publishedCourses(searchOf(context));
  const families = new Map<string, PublishedCourse[]>();
  for (const course of published) {
    if (!chapterFor(course, context)) continue;
    families.set(course.familyId, [
      ...(families.get(course.familyId) ?? []),
      course,
    ]);
  }
  const started = await training.enrollmentsOf(
    userId,
    published.map((course) => course.id),
  );
  const picks = [...families.values()].map((variants) => {
    const course =
      variants.find((variant) => started.has(variant.id)) ??
      pickVariant(variants, [locale, "en"])!;
    return { course, chapter: chapterFor(course, context)!, variants };
  });
  return { context, courses: await buildCards(userId, picks) };
}

async function accessibleCourse(userId: string, courseId: string) {
  const context = await trainingContext(userId);
  if (context.length === 0) return null;
  const published = await training.publishedCourses(searchOf(context));
  const course = published.find((row) => row.id === courseId);
  if (!course) return null;
  const chapter = chapterFor(course, context);
  if (!chapter) return null;
  const variants = published.filter(
    (row) => row.familyId === course.familyId && chapterFor(row, context),
  );
  return { course, chapter, variants };
}

export const courseOverview = cache(
  async (userId: string, courseId: string) => {
    const access = await accessibleCourse(userId, courseId);
    if (!access) return null;
    const [card] = await buildCards(userId, [access]);
    return card;
  },
);

export async function requireCourseAccess(userId: string, courseId: string) {
  const card = await courseOverview(userId, courseId);
  if (!card) throw new DomainError("unknownTrainingCourse");
  return card;
}

function elementOf(card: CourseCard, elementId: string) {
  const index = card.elements.findIndex((element) => element.id === elementId);
  return index === -1 ? null : { element: card.elements[index], index };
}

export async function requireLessonAccess(
  userId: string,
  courseId: string,
  lessonId: string,
) {
  const card = await requireCourseAccess(userId, courseId);
  const found = elementOf(card, lessonId);
  if (!found || found.element.kind !== "lesson")
    throw new DomainError("unknownTrainingLesson");
  if (found.element.locked) throw new DomainError("quizLocked");
  const lesson = await training.lessonForLearner(lessonId);
  if (!lesson) throw new DomainError("unknownTrainingLesson");
  return { card, lesson, index: found.index };
}

async function requireQuizAccess(
  userId: string,
  courseId: string,
  elementId: string,
) {
  const card = await requireCourseAccess(userId, courseId);
  const found = elementOf(card, elementId);
  if (!found || found.element.kind !== "quiz")
    throw new DomainError("unknownTrainingLesson");
  return card;
}

export async function elementPage(
  userId: string,
  courseId: string,
  elementId: string,
) {
  const card = await courseOverview(userId, courseId);
  const found = card ? elementOf(card, elementId) : null;
  if (!card || !found) return null;
  const { element, index } = found;
  const base = {
    card,
    element,
    index,
    previous: card.elements[index - 1] ?? null,
    next: card.elements[index + 1] ?? null,
    blocker: element.locked ? nextOpenElement(card.elements) : null,
  };
  if (element.kind === "quiz")
    return {
      ...base,
      kind: "quiz" as const,
      quiz: await training.quizPreview(userId, elementId),
    };
  if (element.locked) return { ...base, kind: "locked" as const };
  const lesson = await training.lessonForLearner(elementId);
  if (!lesson) return null;
  return {
    ...base,
    kind: "lesson" as const,
    lesson,
    progress: element.progress,
  };
}

export async function recordLessonProgress(
  userId: string,
  courseId: string,
  beat: HeartbeatInput,
) {
  const { card, lesson } = await requireLessonAccess(
    userId,
    courseId,
    beat.lessonId,
  );
  return training.recordHeartbeat(userId, lesson, beat, card.chapterId);
}

export async function acknowledgeLesson(
  userId: string,
  courseId: string,
  lessonId: string,
) {
  const { card, lesson } = await requireLessonAccess(
    userId,
    courseId,
    lessonId,
  );
  return training.acknowledgeLesson(userId, lesson, card.chapterId);
}

export async function startQuiz(
  userId: string,
  courseId: string,
  elementId: string,
) {
  await requireQuizAccess(userId, courseId, elementId);
  return training.startAttempt(userId, elementId);
}

export async function submitQuiz(
  userId: string,
  courseId: string,
  elementId: string,
  answers: QuizAnswers,
) {
  const card = await requireQuizAccess(userId, courseId, elementId);
  return training.submitAttempt(userId, elementId, answers, card.chapterId);
}

async function adminSeesCourse(access: Access, courseId: string) {
  if (!hasAnyAdminScope(access)) return false;
  const course = await training.getCourse(courseId);
  if (!course) return false;
  if (allowsAdmin(access, training.familyAuthority(course.family))) return true;
  const adminChapters = access.memberships
    .filter((m) => m.roles.includes("admin"))
    .map((m) => m.chapterId);
  const countries = await chapters.getChapterCountryIds(adminChapters);
  return training.familyVisibleTo(course.family, {
    countryIds: [...access.countryAdminOf, ...countries.values()].filter(
      (id): id is string => id !== null,
    ),
    chapterIds: adminChapters,
  });
}

export async function readableTrainingAttachment(
  viewer: { user: { id: string }; access: Access },
  fileId: string,
) {
  const found = await training.attachmentOf(fileId);
  if (!found) return null;
  if (!found.lesson)
    return found.uploadedByUserId === viewer.user.id ? found.file : null;
  if (allowsAdmin(viewer.access, found.authority)) return found.file;
  if (await adminSeesCourse(viewer.access, found.lesson.courseId))
    return found.file;
  const card = await courseOverview(viewer.user.id, found.lesson.courseId);
  return card?.elements.some(
    (element) => element.id === found.lesson!.id && !element.locked,
  )
    ? found.file
    : null;
}
