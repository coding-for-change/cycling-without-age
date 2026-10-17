import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

export const requirementSelect = {
  id: true,
  familyId: true,
  scope: true,
  scopeKey: true,
  countryId: true,
  chapterId: true,
  createdByUserId: true,
  createdAt: true,
  chapter: { select: { countryId: true } },
} satisfies Prisma.TrainingRequirementSelect;

export type RequirementRow = Prisma.TrainingRequirementGetPayload<{
  select: typeof requirementSelect;
}>;

export const findRequirements = (where: Prisma.TrainingRequirementWhereInput) =>
  prisma.trainingRequirement.findMany({
    where,
    orderBy: { createdAt: "asc" },
    select: requirementSelect,
    take: 1000,
  });

export const findRequirementById = (id: string) =>
  prisma.trainingRequirement.findUnique({
    where: { id },
    select: requirementSelect,
  });

export const upsertRequirement = (
  data: Prisma.TrainingRequirementUncheckedCreateInput & { scopeKey: string },
) =>
  prisma.trainingRequirement.upsert({
    where: {
      scopeKey_familyId: { scopeKey: data.scopeKey, familyId: data.familyId },
    },
    create: data,
    update: {},
    select: requirementSelect,
  });

export const deleteRequirementById = (id: string) =>
  prisma.trainingRequirement.deleteMany({ where: { id } });

export const deleteRequirementWhere = (where: {
  scopeKey: string;
  familyId: string;
}) => prisma.trainingRequirement.deleteMany({ where });

const requirementListSelect = {
  ...requirementSelect,
  country: { select: { name: true } },
  chapter: { select: { name: true, countryId: true } },
  family: {
    select: {
      id: true,
      scope: true,
      countryId: true,
      chapterId: true,
      courses: {
        orderBy: { createdAt: "asc" },
        select: { id: true, language: true, title: true, publishedAt: true },
      },
    },
  },
} satisfies Prisma.TrainingRequirementSelect;

export type RequirementListRow = Prisma.TrainingRequirementGetPayload<{
  select: typeof requirementListSelect;
}>;

export const findRequirementList = (
  where: Prisma.TrainingRequirementWhereInput,
) =>
  prisma.trainingRequirement.findMany({
    where,
    orderBy: { createdAt: "asc" },
    select: requirementListSelect,
    take: 500,
  });
