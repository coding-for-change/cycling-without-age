import { resolveEmailLocale } from "@/emails/strings";
import { notifications } from "@/features/notifications";
import { profile } from "@/features/profile";
import { devConsole } from "@/lib/observability/logger";
import { worker as workerMetrics } from "@/lib/observability/metrics";
import { isPushConfigured, sendPush } from "@/lib/push";
import { kindOf, renderMessage } from "./kinds";

const CHANNEL = "push";

const recordSkipped = (reason: string) =>
  workerMetrics.deliveries.inc({
    channel: CHANNEL,
    status: "skipped",
    reason,
  });

const recordFailed = (reason: string) =>
  workerMetrics.deliveries.inc({
    channel: CHANNEL,
    status: "failed",
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

export async function deliverPush(notificationId: string) {
  const notification = await notifications.get(notificationId);
  if (!notification) return;
  const kind = kindOf(notification.event.type);

  const delivery = await notifications.beginDelivery({
    notificationId,
    channel: "push",
  });
  if (!delivery) return;

  const recipient = notification.recipientUserId;
  const account = await profile.getProfile(recipient);
  if (!account) {
    await notifications.deliverySkipped(delivery.id, "no account");
    recordSkipped("no account");
    return;
  }
  if (kind.policy.optional && !account.notifyPush) {
    await notifications.deliverySkipped(delivery.id, "opted out");
    recordSkipped("opted out");
    return;
  }
  if (
    kind.chapterAllowsPush &&
    !(await kind.chapterAllowsPush(notification.event.chapterId))
  ) {
    await notifications.deliverySkipped(delivery.id, "disabled by chapter");
    recordSkipped("disabled by chapter");
    return;
  }

  const tokens = await notifications.listDeviceTokens(recipient);
  if (tokens.length === 0) {
    await notifications.deliverySkipped(delivery.id, "no device");
    recordSkipped("no device");
    return;
  }

  const locale = resolveEmailLocale(account.locale);
  const message = renderMessage(kind, notification.payload, locale);

  if (!isPushConfigured()) {
    devConsole.info(
      "[push] FIREBASE_SERVICE_ACCOUNT unset — skipping",
      notificationId,
    );
    await notifications.deliverySkipped(delivery.id, "push not configured");
    recordSkipped("push not configured");
    return;
  }

  try {
    const { sent, invalidTokens } = await sendPush({
      tokens,
      title: message.title ?? message.heading,
      body: message.body,
      data: { href: notification.href, notificationId },
      badge: await notifications.unseenCount(recipient),
    });

    await notifications.removeDeviceTokens(invalidTokens);

    if (sent > 0) {
      await notifications.deliverySent(delivery.id, null);
      recordSent(notification.event.createdAt);
    } else {
      await notifications.deliveryFailed(delivery.id, "all tokens rejected");
      recordFailed("all tokens rejected");
    }
  } catch (error) {
    await notifications.deliveryFailed(delivery.id, String(error));
    recordFailed("error");
    throw error;
  }
}
