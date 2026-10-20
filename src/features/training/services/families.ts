import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

export const familyOwnerSelect = {
  id: true,
  scope: true,
  scopeKey: true,
  countryId: true,
  chapterId: true,
  country: { select: { id: true, name: true } },
  chapter: { select: { id: true, name: true, countryId: true } },
} satisfies Prisma.TrainingCourseFamilySelect;

export type FamilyOwnerRow = Prisma.TrainingCourseFamilyGetPayload<{
  select: typeof familyOwnerSelect;
}>;

const familyListSelect = {
  ...familyOwnerSelect,
  createdAt: true,
  courses: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      language: true,
      title: true,
      summary: true,
      publishedAt: true,
      updatedAt: true,
      lessons: { select: { kind: true } },
    },
  },
} satisfies Prisma.TrainingCourseFamilySelect;

export type FamilyListRow = Prisma.TrainingCourseFamilyGetPayload<{
  select: typeof familyListSelect;
}>;

export const findFamilies = (where: Prisma.TrainingCourseFamilyWhereInput) =>
  prisma.trainingCourseFamily.findMany({
    where,
    orderBy: { createdAt: "asc" },
    select: familyListSelect,
    take: 200,
  });

export const findFamilyById = (id: string) =>
  prisma.trainingCourseFamily.findUnique({
    where: { id },
    select: familyOwnerSelect,
  });

export const insertFamily = (
  data: Prisma.TrainingCourseFamilyUncheckedCreateInput,
  db: Prisma.TransactionClient = prisma,
) => db.trainingCourseFamily.create({ data, select: { id: true } });

export const deleteEmptyFamily = (
  id: string,
  db: Prisma.TransactionClient = prisma,
) =>
  db.trainingCourseFamily.deleteMany({ where: { id, courses: { none: {} } } });
