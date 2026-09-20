import { z } from "zod";
import { isAppPath } from "@/lib/app-path";

export const notificationCategory = z.enum([
  "application",
  "invitation",
  "welcome",
  "membership",
]);
export type NotificationCategory = z.infer<typeof notificationCategory>;

export const deliveryChannel = z.enum(["email", "push"]);
export type DeliveryChannel = z.infer<typeof deliveryChannel>;

export const notificationPayload = z.record(
  z.string(),
  z.union([z.string().max(1000), z.boolean(), z.null()]),
);
export type NotificationPayload = z.infer<typeof notificationPayload>;

// Rendered at display time, so what we keep are the parameters, never the
// sentence: the inbox has to re-render when a user switches language.
export const createNotificationInput = z.object({
  eventId: z.string().min(1),
  recipientUserId: z.string().min(1),
  category: notificationCategory,
  payload: notificationPayload,
  // An absolute URL here would make every notification an open redirect.
  href: z.string().refine(isAppPath, "href must be an app-relative path"),
  collapseKey: z.string().min(1).max(191).optional(),
});
export type CreateNotificationInput = z.infer<typeof createNotificationInput>;

export const beginDeliveryInput = z.object({
  notificationId: z.string().min(1),
  channel: deliveryChannel,
});
export type BeginDeliveryInput = z.infer<typeof beginDeliveryInput>;

export const INBOX_PAGE_SIZE = 20;

export const devicePlatform = z.enum(["ios", "android"]);
export type DevicePlatform = z.infer<typeof devicePlatform>;

export const deviceToken = z.string().min(1).max(512);

export const registerDeviceInput = z.object({
  userId: z.string().min(1),
  token: deviceToken,
  platform: devicePlatform,
});
export type RegisterDeviceInput = z.infer<typeof registerDeviceInput>;

// What a client may send: the owner comes from the session, never the payload.
export const deviceInput = z.object({
  token: deviceToken,
  platform: devicePlatform,
});
export type DeviceInput = z.infer<typeof deviceInput>;

export const deviceTokenInput = z.object({ token: deviceToken });
export type DeviceTokenInput = z.infer<typeof deviceTokenInput>;
