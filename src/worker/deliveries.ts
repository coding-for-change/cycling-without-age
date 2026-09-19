import { Worker } from "bullmq";
import type { Job } from "bullmq";
import { deliverEmail } from "@/use-cases/notifications/deliver-email";
import { deliverPush } from "@/use-cases/notifications/deliver-push";
import { QUEUE, queue } from "@/lib/events/queues";
import { MailRateLimitedError } from "@/lib/mailer";

export type DeliveryJob = Job<{ notificationId: string }>;

export async function parkOnRateLimit<T>(send: () => Promise<T>): Promise<T> {
  try {
    return await send();
  } catch (error) {
    if (!(error instanceof MailRateLimitedError)) throw error;
    await queue(QUEUE.email).rateLimit(error.retryAfterMs);
    throw Worker.RateLimitError();
  }
}

export const runEmailDelivery = (job: DeliveryJob) =>
  parkOnRateLimit(() => deliverEmail(job.data.notificationId));

export const runPushDelivery = (job: DeliveryJob) =>
  deliverPush(job.data.notificationId);
