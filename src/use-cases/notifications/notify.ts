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
  const payload = kind.payload.parse(params);
  const href = kind.href(event);
  const collapseKey = kind.collapseKey?.(event);

  await Promise.all(
    recipients.map(async (recipientUserId) => {
      const notification = await notifications.create({
        eventId: id,
        recipientUserId,
        category: kind.category,
        payload,
        href,
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
