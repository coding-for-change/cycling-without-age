import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

export const progressSelect = {
  lessonId: true,
  furthestSeconds: true,
  positionSeconds: true,
  heartbeatAt: true,
  completedAt: true,
} satisfies Prisma.TrainingLessonProgressSelect;

export type ProgressRow = Prisma.TrainingLessonProgressGetPayload<{
  select: typeof progressSelect;
}>;

export const findProgress = (userId: string, lessonIds: string[]) =>
  prisma.trainingLessonProgress.findMany({
    where: { userId, lessonId: { in: lessonIds } },
    select: progressSelect,
  });

export const findOneProgress = (userId: string, lessonId: string) =>
  prisma.trainingLessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
    select: progressSelect,
  });

export const upsertProgress = (
  userId: string,
  lessonId: string,
  data: {
    furthestSeconds: number;
    positionSeconds: number;
    heartbeatAt: Date;
    completedAt: Date | null;
  },
) =>
  prisma.trainingLessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, ...data },
    update: data,
    select: progressSelect,
  });

export const enrollmentSelect = {
  id: true,
  courseId: true,
  startedAt: true,
  lastActivityAt: true,
  lastLessonId: true,
  passedAt: true,
  attemptCount: true,
} satisfies Prisma.TrainingEnrollmentSelect;

export type EnrollmentRow = Prisma.TrainingEnrollmentGetPayload<{
  select: typeof enrollmentSelect;
}>;

export const findEnrollments = (userId: string, courseIds: string[]) =>
  prisma.trainingEnrollment.findMany({
    where: { userId, courseId: { in: courseIds } },
    select: enrollmentSelect,
  });

export const touchEnrollment = (
  userId: string,
  courseId: string,
  lastLessonId: string | null,
  now: Date,
) =>
  prisma.trainingEnrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: {
      userId,
      courseId,
      startedAt: now,
      lastActivityAt: now,
      lastLessonId,
    },
    update: {
      lastActivityAt: now,
      ...(lastLessonId ? { lastLessonId } : {}),
    },
    select: enrollmentSelect,
  });

export const attemptSelect = {
  id: true,
  enrollmentId: true,
  lessonId: true,
  number: true,
  questionOrder: true,
  startedAt: true,
  submittedAt: true,
  answers: true,
  correctCount: true,
  total: true,
  passed: true,
} satisfies Prisma.TrainingQuizAttemptSelect;

export const findLatestAttempt = (enrollmentId: string, lessonId: string) =>
  prisma.trainingQuizAttempt.findFirst({
    where: { enrollmentId, lessonId },
    orderBy: { number: "desc" },
    select: attemptSelect,
  });

export const insertAttempt = (
  data: Prisma.TrainingQuizAttemptUncheckedCreateInput,
) =>
  prisma.trainingQuizAttempt.upsert({
    where: {
      enrollmentId_lessonId_number: {
        enrollmentId: data.enrollmentId,
        lessonId: data.lessonId,
        number: data.number,
      },
    },
    create: data,
    update: {},
    select: attemptSelect,
  });

export const submitAttemptRow = (
  tx: Prisma.TransactionClient,
  id: string,
  data: {
    submittedAt: Date;
    answers: Prisma.InputJsonObject;
    correctCount: number;
    total: number;
    passed: boolean;
  },
) =>
  tx.trainingQuizAttempt.updateMany({
    where: { id, submittedAt: null },
    data,
  });

export const countAttempt = (
  tx: Prisma.TransactionClient,
  enrollmentId: string,
  now: Date,
) =>
  tx.trainingEnrollment.update({
    where: { id: enrollmentId },
    data: { attemptCount: { increment: 1 }, lastActivityAt: now },
    select: { id: true },
  });

export const completeElementOnce = async (
  tx: Prisma.TransactionClient,
  userId: string,
  lessonId: string,
  now: Date,
) => {
  await tx.trainingLessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: {
      userId,
      lessonId,
      furthestSeconds: 0,
      positionSeconds: 0,
      heartbeatAt: now,
      completedAt: now,
    },
    update: { heartbeatAt: now },
    select: { lessonId: true },
  });
  return tx.trainingLessonProgress.updateMany({
    where: { userId, lessonId, completedAt: null },
    data: { completedAt: now },
  });
};

export const findCompletedLessonIds = async (
  userId: string,
  lessonIds: string[],
  db: Prisma.TransactionClient = prisma,
) =>
  (
    await db.trainingLessonProgress.findMany({
      where: {
        userId,
        lessonId: { in: lessonIds },
        completedAt: { not: null },
      },
      select: { lessonId: true },
    })
  ).map((row) => row.lessonId);

export const findEnrollmentId = (
  userId: string,
  courseId: string,
  db: Prisma.TransactionClient = prisma,
) =>
  db.trainingEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true, passedAt: true },
  });

export const markPassedOnce = (
  tx: Prisma.TransactionClient,
  enrollmentId: string,
  passedAt: Date,
) =>
  tx.trainingEnrollment.updateMany({
    where: { id: enrollmentId, passedAt: null },
    data: { passedAt },
  });

export const findEnrollmentsOfUsers = (
  userIds: string[],
  courseIds: string[],
) =>
  prisma.trainingEnrollment.findMany({
    where: { userId: { in: userIds }, courseId: { in: courseIds } },
    select: { ...enrollmentSelect, userId: true },
  });

export const findCompletionsOfUsers = (
  userIds: string[],
  lessonIds: string[],
) =>
  prisma.trainingLessonProgress.findMany({
    where: {
      userId: { in: userIds },
      lessonId: { in: lessonIds },
      completedAt: { not: null },
    },
    select: { userId: true, lessonId: true },
  });
