import type { Prisma } from "@/generated/prisma";
import {
  beginDeliveryInput,
  createNotificationInput,
  INBOX_PAGE_SIZE,
} from "./schemas";
import type { BeginDeliveryInput, CreateNotificationInput } from "./schemas";
import {
  countUnseenOfUser,
  findNotificationById,
  findNotificationsOfUser,
  stampRead,
  stampSeen,
  upsertNotification,
} from "./services/notifications";
import {
  abandonDelivery,
  finishDelivery,
  findDelivery,
  startDelivery,
} from "./services/deliveries";

/**
 * Idempotent by table constraint: the unique (eventId, recipientUserId) turns a
 * redelivered job into a no-op instead of a second card in the bell.
 */
export async function create(input: CreateNotificationInput) {
  const data = createNotificationInput.parse(input);
  return upsertNotification({
    ...data,
    payload: data.payload as Prisma.InputJsonObject,
  });
}

export const get = (id: string) => findNotificationById(id);

export const listInbox = (recipientUserId: string, take = INBOX_PAGE_SIZE) =>
  findNotificationsOfUser(recipientUserId, take);

export const unseenCount = (recipientUserId: string) =>
  countUnseenOfUser(recipientUserId);

// Ownership is part of the WHERE clause, never a separate check: a caller
// cannot mark someone else's notification read by guessing an id.
export const markSeen = async (recipientUserId: string) =>
  (await stampSeen(recipientUserId)).count;

export const markRead = async (id: string, recipientUserId: string) =>
  (await stampRead(id, recipientUserId)).count > 0;

/**
 * Claims the attempt and returns the row to report against, or null when this
 * channel already went out — the guard against a retry double-sending.
 */
export async function beginDelivery(input: BeginDeliveryInput) {
  const { notificationId, channel } = beginDeliveryInput.parse(input);
  const existing = await findDelivery(notificationId, channel);
  if (existing?.status === "sent") return null;
  return startDelivery(notificationId, channel);
}

export const deliverySent = (id: string, providerMessageId: string | null) =>
  finishDelivery(id, providerMessageId);

export const deliveryFailed = (id: string, reason: string) =>
  abandonDelivery(id, "failed", reason);

export const deliverySkipped = (id: string, reason: string) =>
  abandonDelivery(id, "skipped", reason);
