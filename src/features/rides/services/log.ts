import { prisma } from "@/lib/prisma";
import type { $Enums, Prisma } from "@/generated/prisma";

const logSelect = {
  id: true,
  type: true,
  payload: true,
  createdAt: true,
  actor: { select: { id: true, name: true } },
} satisfies Prisma.RideLogEntrySelect;

export type RideLogRow = Prisma.RideLogEntryGetPayload<{
  select: typeof logSelect;
}>;

export const insertRideLogEntry = (
  rideId: string,
  actorUserId: string | null,
  type: $Enums.RideLogType,
  payload: Prisma.InputJsonObject,
  db: Prisma.TransactionClient = prisma,
) =>
  db.rideLogEntry.create({
    data: { rideId, actorUserId, type, payload },
    select: { id: true },
  });

export const findLogOfRide = (rideId: string, take = 200) =>
  prisma.rideLogEntry.findMany({
    where: { rideId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: logSelect,
    take,
  });
