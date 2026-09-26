import { prisma } from "@/lib/prisma";
import type { $Enums, Prisma } from "@/generated/prisma";

const logSelect = {
  id: true,
  type: true,
  payload: true,
  createdAt: true,
  actor: { select: { id: true, name: true } },
} satisfies Prisma.TrishawLogEntrySelect;

export type LogRow = Prisma.TrishawLogEntryGetPayload<{
  select: typeof logSelect;
}>;

export const insertLogEntry = (
  trishawId: string,
  actorUserId: string | null,
  type: $Enums.TrishawLogType,
  payload: Prisma.InputJsonObject,
  db: Prisma.TransactionClient = prisma,
) =>
  db.trishawLogEntry.create({
    data: { trishawId, actorUserId, type, payload },
    select: { id: true },
  });

export const findLogOfTrishaw = (trishawId: string, take = 200) =>
  prisma.trishawLogEntry.findMany({
    where: { trishawId },
    orderBy: { createdAt: "desc" },
    select: logSelect,
    take,
  });
