import { createElement } from "react";
import { NotificationEmail } from "@/emails/notification";
import { getEmailStrings, resolveEmailLocale } from "@/emails/strings";
import { notifications } from "@/features/notifications";
import { profile } from "@/features/profile";
import { activity } from "@/lib/activity";
import { APP_URL } from "@/lib/app-url";
import { sendMail } from "@/lib/mailer";
import { kindOf } from "./kinds";
import type { Message } from "./kinds/types";

export async function deliverEmail(notificationId: string) {
  const notification = await notifications.get(notificationId);
  if (!notification) return;
  const kind = kindOf(notification.event.type);

  const delivery = await notifications.beginDelivery({
    notificationId,
    channel: "email",
  });
  if (!delivery) return;

  const account = await profile.getProfile(notification.recipientUserId);
  if (!account?.email) {
    await notifications.deliverySkipped(delivery.id, "no email address");
    return;
  }

  try {
    const locale = resolveEmailLocale(account.locale);
    const message = kind.message(
      kind.payload.parse(notification.payload),
      getEmailStrings(locale),
    );
    const href = `${APP_URL}${notification.href}`;

    await sendMail({
      to: account.email,
      subject: message.subject,
      text: plainText(message, href),
      react: createElement(NotificationEmail, { locale, message, href }),
    });
    await notifications.deliverySent(delivery.id, null);
    await activity.record({
      userId: notification.recipientUserId,
      actorUserId: notification.event.actorUserId ?? undefined,
      chapterId: notification.event.chapterId ?? undefined,
      type: "emailSent",
      payload: { template: message.template ?? notification.category },
    });
  } catch (error) {
    await notifications.deliveryFailed(delivery.id, String(error));
    // Rethrow. A swallowed error is a job BullMQ believes succeeded, and the
    // mail is then lost for good instead of retried.
    throw error;
  }
}

const plainText = ({ heading, body, note, cta }: Message, href: string) =>
  [
    heading,
    body,
    note ? `${note.heading}\n${note.text}` : null,
    `${cta}: ${href}`,
  ]
    .filter(Boolean)
    .join("\n\n");
