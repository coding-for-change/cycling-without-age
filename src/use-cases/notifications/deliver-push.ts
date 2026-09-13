import { getEmailStrings, resolveEmailLocale } from "@/emails/strings";
import { notifications } from "@/features/notifications";
import { profile } from "@/features/profile";
import { isPushConfigured, sendPush } from "@/lib/push";
import { kindOf } from "./kinds";

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
    return;
  }
  if (kind.policy.optional && !account.notifyPush) {
    await notifications.deliverySkipped(delivery.id, "opted out");
    return;
  }

  const tokens = await notifications.listDeviceTokens(recipient);
  if (tokens.length === 0) {
    await notifications.deliverySkipped(delivery.id, "no device");
    return;
  }

  const locale = resolveEmailLocale(account.locale);
  const message = kind.message(
    kind.payload.parse(notification.payload),
    getEmailStrings(locale),
    locale,
  );

  // Missing credentials are a setup state, not an outage: the row records it
  // and the job completes instead of retrying five times against nothing.
  if (!isPushConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        "[push] FIREBASE_SERVICE_ACCOUNT unset — skipping",
        notificationId,
      );
    }
    await notifications.deliverySkipped(delivery.id, "push not configured");
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

    // Every token was dead: nothing to retry, the devices are already gone.
    if (sent > 0) await notifications.deliverySent(delivery.id, null);
    else await notifications.deliveryFailed(delivery.id, "all tokens rejected");
  } catch (error) {
    await notifications.deliveryFailed(delivery.id, String(error));
    throw error;
  }
}
