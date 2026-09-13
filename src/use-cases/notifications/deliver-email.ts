import { createElement } from "react";
import { NotificationEmail } from "@/emails/notification";
import { getEmailStrings, resolveEmailLocale } from "@/emails/strings";
import { notifications } from "@/features/notifications";
import { profile } from "@/features/profile";
import { activity } from "@/lib/activity";
import { APP_URL } from "@/lib/app-url";
import { MailRateLimitedError, sendMail } from "@/lib/mailer";
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

  const skip = await reasonToSkip(notification, kind.policy, account);
  if (skip) {
    await notifications.deliverySkipped(delivery.id, skip);
    return;
  }

  try {
    const locale = resolveEmailLocale(account.locale);
    const message = kind.message(
      kind.payload.parse(notification.payload),
      getEmailStrings(locale),
      locale,
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
    // A throttle is not a failed delivery: the row stays `sending` and
    // `beginDelivery` re-claims it when the worker retries the job.
    if (error instanceof MailRateLimitedError) throw error;
    await notifications.deliveryFailed(delivery.id, String(error));
    // Rethrow. A swallowed error is a job BullMQ believes succeeded, and the
    // mail is then lost for good instead of retried.
    throw error;
  }
}

/**
 * The run-time half of the policy. A delayed `ifNoPush` job wakes up two
 * minutes after the push went out, so the questions it asks — did the push
 * land, has the person already read it — can only be answered here.
 */
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
