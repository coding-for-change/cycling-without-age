import { notifications } from "@/features/notifications";
import type { Envelope } from "@/lib/events/catalog";
import { QUEUE, queue } from "@/lib/events/queues";
import { kindOf } from "./kinds";

export async function notify({ id, event }: Envelope) {
  const kind = kindOf(event.type);

  const [recipients, params] = await Promise.all([
    kind.recipients(event),
    kind.params(event),
  ]);
  const payload = kind.payload.parse(params);
  const href = kind.href(event);

  for (const recipientUserId of recipients) {
    const notification = await notifications.create({
      eventId: id,
      recipientUserId,
      category: kind.category,
      payload,
      href,
    });

    await Promise.all(
      kind.channels.map((channel) =>
        queue(QUEUE.deliveries).add(
          channel,
          { notificationId: notification.id },
          { jobId: `${notification.id}-${channel}` },
        ),
      ),
    );
  }
}
