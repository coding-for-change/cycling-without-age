import { Worker } from "bullmq";
import type { Job } from "bullmq";
import { deliverEmail } from "@/use-cases/notifications/deliver-email";
import { deliverPush } from "@/use-cases/notifications/deliver-push";
import { QUEUE, queue } from "@/lib/events/queues";
import { MailRateLimitedError } from "@/lib/mailer";
import { logger } from "@/lib/observability/logger";
import { worker as workerMetrics } from "@/lib/observability/metrics";

export type DeliveryJob = Job<{ notificationId: string }>;

export async function parkOnRateLimit<T>(
  name: string,
  send: () => Promise<T>,
): Promise<T> {
  try {
    return await send();
  } catch (error) {
    if (!(error instanceof MailRateLimitedError)) throw error;
    await queue(QUEUE.email).rateLimit(error.retryAfterMs);
    workerMetrics.jobs.inc({
      queue: QUEUE.email,
      name,
      outcome: "rate_limited",
    });
    workerMetrics.mailRateLimited.inc();
    logger.warn(
      { queue: QUEUE.email, job: name, retry_after_ms: error.retryAfterMs },
      "email queue parked by the provider",
    );
    throw Worker.RateLimitError();
  }
}

export const runEmailDelivery = (job: DeliveryJob) =>
  parkOnRateLimit(job.name, () => deliverEmail(job.data.notificationId));

export const runPushDelivery = (job: DeliveryJob) =>
  deliverPush(job.data.notificationId);
