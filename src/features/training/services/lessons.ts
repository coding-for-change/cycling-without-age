import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

export const lessonVideoSelect = {
  id: true,
  title: true,
  language: true,
  status: true,
  mediaKey: true,
  revision: true,
  posterSeconds: true,
  durationSeconds: true,
  archivedAt: true,
} satisfies Prisma.TrainingVideoSelect;

export const lessonSelect = {
  id: true,
  courseId: true,
  kind: true,
  position: true,
  title: true,
  body: true,
  videoId: true,
  attachmentFileId: true,
  quizShuffle: true,
  quizDrawCount: true,
  createdAt: true,
  updatedAt: true,
  video: { select: lessonVideoSelect },
  _count: { select: { questions: true } },
} satisfies Prisma.TrainingLessonSelect;

export type LessonRow = Prisma.TrainingLessonGetPayload<{
  select: typeof lessonSelect;
}>;

const ORDER = [
  { position: "asc" },
  { createdAt: "asc" },
] satisfies Prisma.TrainingLessonOrderByWithRelationInput[];

export const findLessonsOfCourse = (courseId: string) =>
  prisma.trainingLesson.findMany({
    where: { courseId },
    orderBy: ORDER,
    select: lessonSelect,
  });

const summarySelect = {
  id: true,
  courseId: true,
  kind: true,
  position: true,
  title: true,
  video: { select: lessonVideoSelect },
  _count: { select: { questions: true } },
} satisfies Prisma.TrainingLessonSelect;

export const findLessonsOfCourses = (courseIds: string[]) =>
  prisma.trainingLesson.findMany({
    where: { courseId: { in: courseIds } },
    orderBy: ORDER,
    select: summarySelect,
  });

export type LessonSummaryRow = Prisma.TrainingLessonGetPayload<{
  select: typeof summarySelect;
}>;

export const findLessonById = (id: string) =>
  prisma.trainingLesson.findUnique({ where: { id }, select: lessonSelect });

export const insertLessonAt = (
  data: Omit<Prisma.TrainingLessonUncheckedCreateInput, "position">,
  position: number | null,
) =>
  prisma.$transaction(async (tx) => {
    const last =
      (
        await tx.trainingLesson.aggregate({
          where: { courseId: data.courseId },
          _max: { position: true },
        })
      )._max.position ?? -1;
    const at =
      position === null ? last + 1 : Math.max(0, Math.min(position, last + 1));
    if (at <= last)
      await tx.trainingLesson.updateMany({
        where: { courseId: data.courseId, position: { gte: at } },
        data: { position: { increment: 1 } },
      });
    return tx.trainingLesson.create({
      data: { ...data, position: at },
      select: { id: true, position: true },
    });
  });

export const updateLessonById = (
  id: string,
  data: Prisma.TrainingLessonUncheckedUpdateInput,
) =>
  prisma.trainingLesson.update({ where: { id }, data, select: { id: true } });

export const deleteLessonById = (id: string) =>
  prisma.trainingLesson.delete({ where: { id }, select: { id: true } });

export const setLessonPositions = (lessonIds: string[]) =>
  prisma.$transaction(
    lessonIds.map((id, position) =>
      prisma.trainingLesson.update({
        where: { id },
        data: { position },
        select: { id: true },
      }),
    ),
  );

export const countLessonsUsingVideo = (videoId: string) =>
  prisma.trainingLesson.count({ where: { videoId } });

export const findAttachmentLesson = (fileId: string) =>
  prisma.trainingLesson.findFirst({
    where: { attachmentFileId: fileId },
    select: { id: true, courseId: true },
  });

export const findStoredFile = (id: string) =>
  prisma.storedFile.findUnique({
    where: { id },
    select: {
      id: true,
      key: true,
      mime: true,
      kind: true,
      uploadedByUserId: true,
    },
  });

export const findAttachmentsOfOwners = (
  chapterIds: string[],
  countryIds: string[],
) =>
  prisma.storedFile.findMany({
    where: {
      kind: "trainingAttachment",
      trainingAttachments: {
        some: {
          OR: [
            { course: { family: { chapterId: { in: chapterIds } } } },
            { course: { family: { countryId: { in: countryIds } } } },
          ],
        },
      },
    },
    select: { id: true, key: true },
  });

export const deleteStoredFilesById = (ids: string[]) =>
  prisma.storedFile.deleteMany({ where: { id: { in: ids } } });
