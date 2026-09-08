import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import type { DeliveryChannel } from "../schemas";

export const findDelivery = (
  notificationId: string,
  channel: DeliveryChannel,
  db: Prisma.TransactionClient = prisma,
) =>
  db.delivery.findUnique({
    where: { notificationId_channel: { notificationId, channel } },
  });

export const startDelivery = (
  notificationId: string,
  channel: DeliveryChannel,
  db: Prisma.TransactionClient = prisma,
) =>
  db.delivery.upsert({
    where: { notificationId_channel: { notificationId, channel } },
    create: { notificationId, channel, status: "sending", attempts: 1 },
    update: { status: "sending", attempts: { increment: 1 } },
  });

export const finishDelivery = (
  id: string,
  providerMessageId: string | null,
  db: Prisma.TransactionClient = prisma,
) =>
  db.delivery.update({
    where: { id },
    data: {
      status: "sent",
      sentAt: new Date(),
      providerMessageId,
      lastError: null,
    },
  });

export const abandonDelivery = (
  id: string,
  status: "failed" | "skipped",
  reason: string,
  db: Prisma.TransactionClient = prisma,
) =>
  db.delivery.update({
    where: { id },
    data: { status, lastError: reason.slice(0, 1000) },
  });
