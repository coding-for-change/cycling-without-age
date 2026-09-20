import { notifications } from "@/features/notifications";
import type { Envelope } from "@/lib/events/catalog";
import { QUEUE, queue } from "@/lib/events/queues";
import { kindOf } from "./kinds";

/**
 * How long a push gets to land before the fallback mail is allowed to run.
 * Long enough that a phone in a pocket still wins, short enough that someone
 * who never installed the app is not left waiting.
 */
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

  for (const recipientUserId of recipients) {
    const notification = await notifications.create({
      eventId: id,
      recipientUserId,
      category: kind.category,
      payload,
      href,
      ...(collapseKey ? { collapseKey } : {}),
    });

    const data = { notificationId: notification.id };

    if (kind.policy.push) {
      await queue(QUEUE.push).add("push", data, {
        jobId: `${notification.id}-push`,
      });
    }

    // "ifNoPush" is the same job, only parked: deliverEmail re-checks at run
    // time whether the push landed or the row was already read.
    if (kind.policy.email !== "never") {
      await queue(QUEUE.email).add("email", data, {
        jobId: `${notification.id}-email`,
        ...(kind.policy.email === "ifNoPush"
          ? { delay: EMAIL_FALLBACK_DELAY_MS }
          : {}),
      });
    }
  }
}
