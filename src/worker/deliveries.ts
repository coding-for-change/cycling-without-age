import { Worker } from "bullmq";
import type { Job } from "bullmq";
import { deliverEmail } from "@/use-cases/notifications/deliver-email";
import { deliverPush } from "@/use-cases/notifications/deliver-push";
import { QUEUE, queue } from "@/lib/events/queues";
import { MailRateLimitedError } from "@/lib/mailer";

export type DeliveryJob = Job<{ notificationId: string }>;

/**
 * Resend throttles per team, and the sign-in OTPs the app sends directly share
 * that budget. When it answers 429 the whole email worker parks until the
 * window Resend named reopens, and `RateLimitError` puts the job back to
 * waiting without spending one of its five attempts.
 */
export async function runEmailDelivery(job: DeliveryJob) {
  try {
    await deliverEmail(job.data.notificationId);
  } catch (error) {
    if (!(error instanceof MailRateLimitedError)) throw error;
    await queue(QUEUE.email).rateLimit(error.retryAfterMs);
    throw Worker.RateLimitError();
  }
}

export const runPushDelivery = (job: DeliveryJob) =>
  deliverPush(job.data.notificationId);
