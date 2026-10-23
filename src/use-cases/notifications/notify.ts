import { notifications } from "@/features/notifications";
import type { Envelope } from "@/lib/events/catalog";
import { QUEUE, queue } from "@/lib/events/queues";
import { kindOf } from "./kinds";

export const EMAIL_FALLBACK_DELAY_MS = 120_000;

export async function notify({ id, event }: Envelope) {
  const kind = kindOf(event.type);

  const [recipients, params] = await Promise.all([
    kind.recipients(event),
    kind.params(event),
  ]);
  const shared = kind.payload.parse(params);
  const collapseKey = kind.collapseKey?.(event);
  const audiences = new Map<string, string | undefined>();
  for (const recipient of recipients) {
    const userId = typeof recipient === "string" ? recipient : recipient.userId;
    if (!audiences.has(userId))
      audiences.set(
        userId,
        typeof recipient === "string" ? undefined : recipient.audience,
      );
  }

  await Promise.all(
    [...audiences].map(async ([recipientUserId, audience]) => {
      const payload = kind.payload.parse(
        audience ? { ...shared, audience } : shared,
      );
      const notification = await notifications.create({
        eventId: id,
        recipientUserId,
        category: kind.category,
        payload: kind.forRecipient
          ? kind.payload.parse(kind.forRecipient(payload, recipientUserId))
          : payload,
        href: kind.href(event, audience),
        ...(collapseKey ? { collapseKey } : {}),
      });

      const data = { notificationId: notification.id };

      await Promise.all([
        kind.policy.push
          ? queue(QUEUE.push).add("push", data, {
              jobId: `${notification.id}-push`,
            })
          : null,
        kind.policy.email !== "never"
          ? queue(QUEUE.email).add("email", data, {
              jobId: `${notification.id}-email`,
              ...(kind.policy.email === "ifNoPush"
                ? { delay: EMAIL_FALLBACK_DELAY_MS }
                : {}),
            })
          : null,
      ]);
    }),
  );
}
