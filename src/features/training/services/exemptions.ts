import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

export const exemptionSelect = {
  id: true,
  userId: true,
  familyKey: true,
  familyId: true,
  reason: true,
  grantedByUserId: true,
  chapterId: true,
  grantedAt: true,
} satisfies Prisma.TrainingExemptionSelect;

export type ExemptionRow = Prisma.TrainingExemptionGetPayload<{
  select: typeof exemptionSelect;
}>;

export const findExemptions = (userIds: string[]) =>
  prisma.trainingExemption.findMany({
    where: { userId: { in: userIds } },
    orderBy: { grantedAt: "asc" },
    select: exemptionSelect,
  });

export const findExemption = (
  userId: string,
  familyKey: string,
  db: Prisma.TransactionClient = prisma,
) =>
  db.trainingExemption.findUnique({
    where: { userId_familyKey: { userId, familyKey } },
    select: exemptionSelect,
  });

export const insertExemption = (
  data: Prisma.TrainingExemptionUncheckedCreateInput,
  db: Prisma.TransactionClient = prisma,
) => db.trainingExemption.create({ data, select: exemptionSelect });

export const deleteExemption = (
  userId: string,
  familyKey: string,
  db: Prisma.TransactionClient = prisma,
) => db.trainingExemption.deleteMany({ where: { userId, familyKey } });
