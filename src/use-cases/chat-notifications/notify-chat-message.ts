import { Job } from "bullmq";
import type { Queue } from "bullmq";
import { chat } from "@/features/chat";
import { notifications } from "@/features/notifications";
import { profile } from "@/features/profile";
import type { ProfileSummary } from "@/features/profile";
import type { Envelope } from "@/lib/events/catalog";
import { QUEUE, queue } from "@/lib/events/queues";
import { presence } from "@/lib/realtime";
import { digestDelay, isMuted } from "./digest-window";
import type { ChatDigestJob } from "./deliver-chat-digest";

const RECIPIENT_CHUNK = 25;

const digestKey = (recipientUserId: string, conversationId: string) =>
  `chat-digest-${recipientUserId}-${conversationId}`;

async function windowStartOf(emails: Queue, deduplicationId: string) {
  const jobId = await emails.getDeduplicationJobId(deduplicationId);
  if (!jobId) return null;

  const job = await Job.fromId<ChatDigestJob>(emails, jobId);
  const started = Date.parse(job?.data.windowStartedAt ?? "");
  return Number.isNaN(started) ? null : started;
}

async function queueDigest(recipientUserId: string, conversationId: string) {
  const emails = queue(QUEUE.email);
  const id = digestKey(recipientUserId, conversationId);
  const now = Date.now();
  const windowStartedAt = (await windowStartOf(emails, id)) ?? now;

  await emails.add(
    "chat-digest",
    {
      recipientUserId,
      conversationId,
      windowStartedAt: new Date(windowStartedAt).toISOString(),
    },
    {
      delay: digestDelay({ windowStartedAt, now }),
      deduplication: { id, extend: true, replace: true },
    },
  );
}

async function notifyRecipient(
  recipient: ProfileSummary,
  { conversationId, messageId }: { conversationId: string; messageId: string },
) {
  if (!recipient.notifyChatPush && !recipient.notifyChatEmail) return;
  if (await presence.isFocusedOn(recipient.id, conversationId)) return;

  const conversation = await chat.getConversation(conversationId, recipient.id);
  if (!conversation || isMuted(conversation.me.mutedUntil)) return;

  const tokens = recipient.notifyChatPush
    ? await notifications.listDeviceTokens(recipient.id)
    : [];

  if (tokens.length > 0) {
    await queue(QUEUE.push).add(
      "chat",
      { recipientUserId: recipient.id, conversationId, messageId },
      { jobId: `chat-${messageId}-${recipient.id}` },
    );
    return;
  }

  if (recipient.notifyChatEmail)
    await queueDigest(recipient.id, conversationId);
}

export async function notifyChatMessage({
  event,
}: Envelope<"chat.messageSent">) {
  const message = await chat.getMessage(event.messageId);
  if (!message || message.kind !== "text" || message.deletedAt) return;

  const members = await chat.listMembers(event.conversationId);
  const recipientIds = members
    .map((member) => member.userId)
    .filter((userId) => userId !== event.actorUserId);
  if (recipientIds.length === 0) return;

  const recipients = await profile.getProfiles(recipientIds);

  for (let start = 0; start < recipients.length; start += RECIPIENT_CHUNK) {
    await Promise.all(
      recipients.slice(start, start + RECIPIENT_CHUNK).map((recipient) =>
        notifyRecipient(recipient, {
          conversationId: event.conversationId,
          messageId: event.messageId,
        }),
      ),
    );
  }
}
