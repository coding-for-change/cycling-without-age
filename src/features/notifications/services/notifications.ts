import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

export const upsertNotification = (
  data: Prisma.NotificationUncheckedCreateInput,
  db: Prisma.TransactionClient = prisma,
) =>
  db.notification.upsert({
    where: {
      eventId_recipientUserId: {
        eventId: data.eventId,
        recipientUserId: data.recipientUserId,
      },
    },
    create: data,
    update: {},
  });

export const findNotificationById = (
  id: string,
  db: Prisma.TransactionClient = prisma,
) =>
  db.notification.findUnique({
    where: { id },
    include: {
      event: { select: { type: true, actorUserId: true, chapterId: true } },
    },
  });

export const findNotificationsOfUser = (
  recipientUserId: string,
  take: number,
  db: Prisma.TransactionClient = prisma,
) =>
  db.notification.findMany({
    where: { recipientUserId },
    orderBy: { createdAt: "desc" },
    take,
  });

export const countUnseenOfUser = (
  recipientUserId: string,
  db: Prisma.TransactionClient = prisma,
) => db.notification.count({ where: { recipientUserId, seenAt: null } });

export const stampSeen = (
  recipientUserId: string,
  db: Prisma.TransactionClient = prisma,
) =>
  db.notification.updateMany({
    where: { recipientUserId, seenAt: null },
    data: { seenAt: new Date() },
  });

export const stampRead = (
  id: string,
  recipientUserId: string,
  db: Prisma.TransactionClient = prisma,
) =>
  db.notification.updateMany({
    where: { id, recipientUserId, readAt: null },
    data: { readAt: new Date(), seenAt: new Date() },
  });
