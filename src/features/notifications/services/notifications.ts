import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

export const upsertNotification = (
  data: Prisma.NotificationUncheckedCreateInput,
) =>
  prisma.notification.upsert({
    where: {
      eventId_recipientUserId: {
        eventId: data.eventId,
        recipientUserId: data.recipientUserId,
      },
    },
    create: data,
    update: {},
  });

export const findNotificationById = (id: string) =>
  prisma.notification.findUnique({
    where: { id },
    include: {
      event: { select: { type: true, actorUserId: true, chapterId: true } },
    },
  });

export const findNotificationsOfUser = (
  recipientUserId: string,
  take: number,
) =>
  prisma.notification.findMany({
    where: { recipientUserId },
    orderBy: { createdAt: "desc" },
    take,
    include: { event: { select: { type: true } } },
  });

export const countUnseenOfUser = (recipientUserId: string) =>
  prisma.notification.count({ where: { recipientUserId, seenAt: null } });

export const stampSeen = (recipientUserId: string) =>
  prisma.notification.updateMany({
    where: { recipientUserId, seenAt: null },
    data: { seenAt: new Date() },
  });

export const stampRead = (id: string, recipientUserId: string) =>
  prisma.notification.updateMany({
    where: { id, recipientUserId, readAt: null },
    data: { readAt: new Date(), seenAt: new Date() },
  });
