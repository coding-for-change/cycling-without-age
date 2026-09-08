import { z } from "zod";

export const notificationCategory = z.enum(["application"]);
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
  href: z.string().regex(/^\/(?!\/)/, "href must be an app-relative path"),
  collapseKey: z.string().min(1).max(191).optional(),
});
export type CreateNotificationInput = z.infer<typeof createNotificationInput>;

export const beginDeliveryInput = z.object({
  notificationId: z.string().min(1),
  channel: deliveryChannel,
});
export type BeginDeliveryInput = z.infer<typeof beginDeliveryInput>;

export const INBOX_PAGE_SIZE = 20;
