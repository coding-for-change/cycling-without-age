import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import { familyOwnerSelect } from "./families";

export const courseSelect = {
  id: true,
  familyId: true,
  language: true,
  title: true,
  summary: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  family: {
    select: {
      ...familyOwnerSelect,
      courses: {
        orderBy: { createdAt: "asc" },
        select: { id: true, language: true, title: true, publishedAt: true },
      },
    },
  },
} satisfies Prisma.TrainingCourseSelect;

export type CourseRow = Prisma.TrainingCourseGetPayload<{
  select: typeof courseSelect;
}>;

export const findCourseById = (id: string) =>
  prisma.trainingCourse.findUnique({ where: { id }, select: courseSelect });

export const insertCourse = (
  data: Prisma.TrainingCourseUncheckedCreateInput,
  db: Prisma.TransactionClient = prisma,
) => db.trainingCourse.create({ data, select: { id: true } });

export const updateCourseById = (
  id: string,
  data: Prisma.TrainingCourseUncheckedUpdateInput,
) =>
  prisma.trainingCourse.update({ where: { id }, data, select: { id: true } });

export const deleteCourseById = (
  id: string,
  db: Prisma.TransactionClient = prisma,
) => db.trainingCourse.delete({ where: { id }, select: { familyId: true } });

export async function countCourseConsequences(courseId: string) {
  const [lessons, quizzes, questions, enrollments, passed] = await Promise.all([
    prisma.trainingLesson.count({ where: { courseId, kind: "lesson" } }),
    prisma.trainingLesson.count({ where: { courseId, kind: "quiz" } }),
    prisma.trainingQuestion.count({ where: { lesson: { courseId } } }),
    prisma.trainingEnrollment.count({ where: { courseId } }),
    prisma.trainingEnrollment.count({
      where: { courseId, passedAt: { not: null } },
    }),
  ]);
  return { lessons, quizzes, questions, enrollments, passed };
}

const publishedCourseSelect = {
  id: true,
  familyId: true,
  language: true,
  title: true,
  summary: true,
  publishedAt: true,
  family: { select: familyOwnerSelect },
} satisfies Prisma.TrainingCourseSelect;

export type PublishedCourseRow = Prisma.TrainingCourseGetPayload<{
  select: typeof publishedCourseSelect;
}>;

export const findPublishedCourses = (
  familyWhere: Prisma.TrainingCourseFamilyWhereInput,
) =>
  prisma.trainingCourse.findMany({
    where: { publishedAt: { not: null }, family: familyWhere },
    orderBy: [{ familyId: "asc" }, { createdAt: "asc" }],
    select: publishedCourseSelect,
    take: 500,
  });

export const findPublishedCoursesOfFamilies = (familyIds: string[]) =>
  prisma.trainingCourse.findMany({
    where: { publishedAt: { not: null }, familyId: { in: familyIds } },
    orderBy: [{ familyId: "asc" }, { createdAt: "asc" }],
    select: publishedCourseSelect,
  });
