import type { Envelope } from "@/lib/events/catalog";
import { QUEUE, queue } from "@/lib/events/queues";

const MEDIA_JOB = {
  attempts: 3,
  backoff: { type: "exponential", delay: 30_000 },
  removeOnFail: { age: 30 * 86_400 },
} as const;

export async function enqueueTranscode({
  event,
}: Envelope<"trainingVideo.uploaded">) {
  await queue(QUEUE.media).add(
    "transcode",
    { videoId: event.videoId, revision: event.revision },
    { ...MEDIA_JOB, jobId: `transcode-${event.videoId}-${event.revision}` },
  );
}

export async function enqueuePoster({
  id,
  event,
}: Envelope<"trainingVideo.posterRequested">) {
  await queue(QUEUE.media).add(
    "poster",
    {
      videoId: event.videoId,
      revision: event.revision,
      seconds: event.seconds,
    },
    { ...MEDIA_JOB, jobId: `poster-${id}` },
  );
}

export async function enqueuePurge({
  event,
}: Envelope<"trainingVideo.deleted">) {
  await queue(QUEUE.media).add(
    "purge",
    {
      videoId: event.videoId,
      mediaKey: event.mediaKey,
      sourceKey: event.sourceKey,
      uploadId: event.uploadId,
    },
    { ...MEDIA_JOB, attempts: 5, jobId: `purge-${event.videoId}` },
  );
}
