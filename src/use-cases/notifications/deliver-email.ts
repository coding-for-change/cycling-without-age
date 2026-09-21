import { createElement } from "react";
import { NotificationEmail } from "@/emails/notification";
import { resolveEmailLocale } from "@/emails/strings";
import { chapters } from "@/features/chapters";
import { notifications } from "@/features/notifications";
import { profile } from "@/features/profile";
import { activity } from "@/lib/activity";
import { APP_URL } from "@/lib/app-url";
import { MailRateLimitedError, sendMail } from "@/lib/mailer";
import { worker as workerMetrics } from "@/lib/observability/metrics";
import { kindOf, renderMessage } from "./kinds";
import type { Message } from "./kinds/types";

const CHANNEL = "email";

const recordSkipped = (reason: string) =>
  workerMetrics.deliveries.inc({
    channel: CHANNEL,
    status: "skipped",
    reason,
  });

const recordSent = (eventCreatedAt: Date) => {
  workerMetrics.deliveries.inc({
    channel: CHANNEL,
    status: "sent",
    reason: "",
  });
  if (eventCreatedAt instanceof Date)
    workerMetrics.deliveryLatency.observe(
      { channel: CHANNEL },
      (Date.now() - eventCreatedAt.getTime()) / 1_000,
    );
};

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
    recordSkipped("no email address");
    return;
  }

  const skip = await reasonToSkip(notification, kind.policy, account);
  if (skip) {
    await notifications.deliverySkipped(delivery.id, skip);
    recordSkipped(skip);
    return;
  }

  try {
    const locale = resolveEmailLocale(account.locale);
    const message = renderMessage(kind, notification.payload, locale);
    const href = `${APP_URL}${notification.href}`;
    const replyTo = await replyToOf(notification.event.chapterId);

    await sendMail({
      to: account.email,
      subject: message.subject,
      text: plainText(message, href),
      react: createElement(NotificationEmail, { locale, message, href }),
      ...(replyTo ? { replyTo } : {}),
    });
    await notifications.deliverySent(delivery.id, null);
    recordSent(notification.event.createdAt);
    await activity.record({
      userId: notification.recipientUserId,
      actorUserId: notification.event.actorUserId ?? undefined,
      chapterId: notification.event.chapterId ?? undefined,
      type: "emailSent",
      payload: { template: message.template ?? notification.category },
    });
  } catch (error) {
    if (error instanceof MailRateLimitedError) throw error;
    await notifications.deliveryFailed(delivery.id, String(error));
    workerMetrics.deliveries.inc({
      channel: CHANNEL,
      status: "failed",
      reason: "error",
    });
    throw error;
  }
}

async function reasonToSkip(
  notification: { id: string; readAt: Date | null },
  policy: { email: "always" | "ifNoPush" | "never"; optional: boolean },
  account: { notifyEmail: boolean },
) {
  if (policy.email === "never") return "email disabled for kind";
  if (policy.optional && !account.notifyEmail) return "opted out";
  if (policy.email !== "ifNoPush") return null;

  if (notification.readAt) return "already read";
  const push = await notifications.getDelivery(notification.id, "push");
  return push?.status === "sent" ? "push delivered" : null;
}

const replyToOf = async (chapterId: string | null) =>
  chapterId ? (await chapters.getSettings(chapterId)).replyToEmail : null;

const plainText = (
  { heading, body, note, steps, cta }: Message,
  href: string,
) =>
  [
    heading,
    body,
    note ? `${note.heading}\n${note.text}` : null,
    steps && steps.items.length > 0
      ? [
          steps.heading,
          ...steps.items.map((item, index) => `${index + 1}. ${item}`),
        ]
          .filter(Boolean)
          .join("\n")
      : null,
    `${cta}: ${href}`,
  ]
    .filter(Boolean)
    .join("\n\n");
