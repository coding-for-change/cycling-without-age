"use client";

import { sendMessageAction, type ChatActionError } from "../actions";
import type { ChatMessageView } from "../schemas";
import { addOptimistic, markFailed, reconcile } from "./chat-store";

const newClientId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export async function sendChatMessage({
  conversationId,
  senderId,
  text,
  replyTo,
  clientId = newClientId(),
}: {
  conversationId: string;
  senderId: string;
  text: string;
  replyTo: ChatMessageView["replyTo"];
  clientId?: string;
}): Promise<ChatActionError | null> {
  addOptimistic({
    conversationId,
    clientId,
    text,
    senderId,
    createdAt: new Date().toISOString(),
    replyTo,
  });

  const result = await sendMessageAction({
    conversationId,
    text,
    clientId,
    replyToId: replyTo?.id,
  });

  if (!result.ok) {
    markFailed(clientId);
    return result.error;
  }

  reconcile(clientId, result.message);
  return null;
}

export const resendChatMessage = (
  message: ChatMessageView,
  senderId: string,
): Promise<ChatActionError | null> =>
  sendChatMessage({
    conversationId: message.conversationId,
    senderId,
    text: message.text,
    replyTo: message.replyTo,
    clientId: message.clientId ?? undefined,
  });
