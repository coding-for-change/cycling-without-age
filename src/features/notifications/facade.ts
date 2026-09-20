import type { Prisma } from "@/generated/prisma";
import {
  beginDeliveryInput,
  createNotificationInput,
  deviceToken as deviceTokenSchema,
  INBOX_PAGE_SIZE,
  registerDeviceInput,
} from "./schemas";
import type {
  BeginDeliveryInput,
  CreateNotificationInput,
  DeliveryChannel,
  RegisterDeviceInput,
} from "./schemas";
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
import {
  deleteDeviceOfUser,
  deleteDevicesByToken,
  deleteDevicesNotSeenSince,
  findTokensOfUser,
  upsertDevice,
} from "./services/devices";

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

export const markSeen = async (recipientUserId: string) =>
  (await stampSeen(recipientUserId)).count;

export const markRead = async (id: string, recipientUserId: string) =>
  (await stampRead(id, recipientUserId)).count > 0;

export async function beginDelivery(input: BeginDeliveryInput) {
  const { notificationId, channel } = beginDeliveryInput.parse(input);
  const existing = await findDelivery(notificationId, channel);
  if (existing?.status === "sent") return null;
  return startDelivery(notificationId, channel);
}

export const getDelivery = (notificationId: string, channel: DeliveryChannel) =>
  findDelivery(notificationId, channel);

export const deliverySent = (id: string, providerMessageId: string | null) =>
  finishDelivery(id, providerMessageId);

export const deliveryFailed = (id: string, reason: string) =>
  abandonDelivery(id, "failed", reason);

export const deliverySkipped = (id: string, reason: string) =>
  abandonDelivery(id, "skipped", reason);

export const registerDevice = (input: RegisterDeviceInput) =>
  upsertDevice(registerDeviceInput.parse(input));

export const unregisterDevice = async (userId: string, token: string) =>
  (await deleteDeviceOfUser(userId, deviceTokenSchema.parse(token))).count > 0;

export const listDeviceTokens = async (userId: string) =>
  (await findTokensOfUser(userId)).map((device) => device.token);

export const removeDeviceTokens = async (tokens: string[]) => {
  if (tokens.length === 0) return 0;
  return (await deleteDevicesByToken(tokens)).count;
};

// FCM itself drops a token after 270 days of inactivity.
export const STALE_DEVICE_DAYS = 270;

export const pruneStaleDevices = async (
  now = new Date(),
  days = STALE_DEVICE_DAYS,
) =>
  (
    await deleteDevicesNotSeenSince(
      new Date(now.getTime() - days * 24 * 60 * 60 * 1000),
    )
  ).count;
