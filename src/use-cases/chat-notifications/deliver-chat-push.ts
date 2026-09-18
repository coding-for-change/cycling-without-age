import { getEmailStrings, resolveEmailLocale } from "@/emails/strings";
import { chat } from "@/features/chat";
import { notifications } from "@/features/notifications";
import { profile } from "@/features/profile";
import { isPushConfigured, sendPush } from "@/lib/push";
import { isMuted } from "./digest-window";
import { previewOf } from "./preview";

export type ChatPushJob = {
  recipientUserId: string;
  conversationId: string;
  messageId: string;
};

export async function deliverChatPush({
  recipientUserId,
  conversationId,
  messageId,
}: ChatPushJob) {
  const message = await chat.getMessage(messageId);
  if (!message || message.kind !== "text" || message.deletedAt) return;

  const conversation = await chat.getConversation(
    conversationId,
    recipientUserId,
  );
  if (!conversation) return;
  if (conversation.me.lastReadSeq >= message.seq) return;
  if (isMuted(conversation.me.mutedUntil)) return;

  const account = await profile.getProfile(recipientUserId);
  if (!account?.notifyChatPush) return;

  const tokens = await notifications.listDeviceTokens(recipientUserId);
  if (tokens.length === 0) return;

  if (!isPushConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        "[push] FIREBASE_SERVICE_ACCOUNT unset — skipping chat",
        messageId,
      );
    }
    return;
  }

  const strings = getEmailStrings(resolveEmailLocale(account.locale));
  const [sender, unseen, unread] = await Promise.all([
    message.senderId ? profile.getProfile(message.senderId) : null,
    notifications.unseenCount(recipientUserId),
    chat.countUnreadConversations(recipientUserId),
  ]);
  const senderName = sender?.name ?? strings.chatDigest.someone;

  const { invalidTokens } = await sendPush({
    tokens,
    title:
      conversation.kind === "group" && conversation.title
        ? `${senderName} · ${conversation.title}`
        : senderName,
    body: previewOf(message.text),
    data: { href: `/chat/${conversationId}`, conversationId },
    collapseKey: conversationId,
    badge: unseen + unread,
  });

  await notifications.removeDeviceTokens(invalidTokens);
}
