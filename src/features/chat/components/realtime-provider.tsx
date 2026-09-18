"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { parseRealtimeEvent } from "@/lib/realtime/events";
import { haptics } from "@/lib/native/haptics";
import {
  loadMessagesAction,
  markReadAction,
  syncInboxAction,
} from "../actions";
import {
  applyEvent,
  markRead,
  setConnected,
  setViewer,
  snapshot,
  upsertConversation,
  upsertMessage,
  useChatConnected,
} from "./chat-store";

const STREAM_PATH = "/api/chat/stream";
const EVENT_TYPES = [
  "message.created",
  "message.updated",
  "reaction.changed",
  "conversation.updated",
  "conversation.created",
  "member.left",
  "read",
  "typing",
  "presence",
] as const;

const ERRORS_BEFORE_REOPEN = 3;
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;
const READ_DEBOUNCE_MS = 1_000;

const backoff = (attempt: number) => {
  const base = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** attempt);
  return base / 2 + Math.random() * (base / 2);
};

export function ChatRealtimeProvider({
  viewerId,
  focusConversationId,
  renderedAt,
  children,
}: {
  viewerId: string;
  focusConversationId: string | null;
  renderedAt: string;
  children: ReactNode;
}) {
  const since = useRef(renderedAt);
  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setViewer(viewerId);
  }, [viewerId]);

  useEffect(() => {
    let source: EventSource | null = null;
    let reopen: ReturnType<typeof setTimeout> | null = null;
    let errors = 0;
    let attempt = 0;
    let closed = false;

    const scheduleRead = (conversationId: string, seq: number) => {
      if (document.visibilityState !== "visible") return;
      if (readTimer.current) clearTimeout(readTimer.current);
      readTimer.current = setTimeout(() => {
        readTimer.current = null;
        markRead(conversationId, seq);
        void markReadAction({ conversationId, seq });
      }, READ_DEBOUNCE_MS);
    };

    const resync = async () => {
      const at = new Date().toISOString();
      const inbox = await syncInboxAction({ since: since.current });
      if (inbox.ok) {
        for (const conversation of inbox.conversations)
          upsertConversation(conversation);
        since.current = at;
      }

      if (!focusConversationId) return;
      const loaded = snapshot().messages.get(focusConversationId) ?? [];
      const afterSeq = loaded.reduce(
        (highest, message) => Math.max(highest, message.seq),
        0,
      );
      const result = await loadMessagesAction({
        conversationId: focusConversationId,
        afterSeq,
      });
      if (!result.ok) return;
      for (const message of result.messages) upsertMessage(message);
    };

    const handle = (raw: MessageEvent<string>) => {
      let payload: unknown;
      try {
        payload = JSON.parse(raw.data);
      } catch {
        return;
      }
      const event = parseRealtimeEvent(payload);
      if (!event) return;

      if (
        event.type === "message.created" &&
        event.conversationId === focusConversationId &&
        event.message.senderId !== viewerId
      ) {
        haptics.tap();
        scheduleRead(event.conversationId, event.message.seq);
      }

      applyEvent(event);
    };

    const open = () => {
      if (closed) return;
      const url = focusConversationId
        ? `${STREAM_PATH}?focus=${encodeURIComponent(focusConversationId)}`
        : STREAM_PATH;
      source = new EventSource(url);

      source.onopen = () => {
        errors = 0;
        attempt = 0;
        setConnected(true);
        void resync();
      };

      source.onerror = () => {
        setConnected(false);
        errors += 1;
        if (errors < ERRORS_BEFORE_REOPEN) return;
        source?.close();
        source = null;
        errors = 0;
        const delay = backoff(attempt);
        attempt += 1;
        reopen = setTimeout(open, delay);
      };

      for (const type of EVENT_TYPES)
        source.addEventListener(type, handle as EventListener);
    };

    open();

    return () => {
      closed = true;
      if (reopen) clearTimeout(reopen);
      if (readTimer.current) clearTimeout(readTimer.current);
      readTimer.current = null;
      source?.close();
      setConnected(false);
    };
  }, [viewerId, focusConversationId]);

  return <>{children}</>;
}

export function useChatConnection(): { connected: boolean } {
  return { connected: useChatConnected() };
}
