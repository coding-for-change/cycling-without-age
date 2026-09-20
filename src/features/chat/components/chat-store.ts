"use client";

import { useSyncExternalStore } from "react";
import type { RealtimeEvent } from "@/lib/realtime/events";
import type { ChatMessageView, ReactionView } from "../schemas";
import type { InboxItem } from "./types";

export const OPTIMISTIC_SEQ = -1;

export type OptimisticDraft = {
  conversationId: string;
  clientId: string;
  text: string;
  senderId: string;
  createdAt: string;
  replyTo: ChatMessageView["replyTo"];
};

type ChatState = {
  connected: boolean;
  seeded: boolean;
  viewerId: string | null;
  conversations: Map<string, InboxItem>;
  order: InboxItem[];
  messages: Map<string, ChatMessageView[]>;
  typing: Map<string, Map<string, string>>;
  typingUsers: Map<string, string[]>;
  presence: Set<string>;
  reads: Map<string, Map<string, number>>;
  drafts: Map<string, string>;
  failed: Set<string>;
};

const emptyState = (): ChatState => ({
  connected: false,
  seeded: false,
  viewerId: null,
  conversations: new Map(),
  order: [],
  messages: new Map(),
  typing: new Map(),
  typingUsers: new Map(),
  presence: new Set(),
  reads: new Map(),
  drafts: new Map(),
  failed: new Set(),
});

let state = emptyState();

const listeners = new Set<() => void>();
const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

const NO_MESSAGES: ChatMessageView[] = [];
const NO_CONVERSATIONS: InboxItem[] = [];
const NO_USERS: string[] = [];
const NO_READS = new Map<string, number>();

const notify = () => {
  for (const listener of listeners) listener();
};

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const rank = (message: ChatMessageView) =>
  message.seq < 0 ? Number.MAX_SAFE_INTEGER : message.seq;

const order = (messages: ChatMessageView[]): ChatMessageView[] =>
  [...messages].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id),
  );

const sortConversations = (items: InboxItem[]): InboxItem[] =>
  [...items].sort((a, b) => {
    if (a.lastMessageAt === b.lastMessageAt) return 0;
    if (a.lastMessageAt === null) return 1;
    if (b.lastMessageAt === null) return -1;
    return b.lastMessageAt.localeCompare(a.lastMessageAt);
  });

const withConversations = (conversations: Map<string, InboxItem>) => {
  state = {
    ...state,
    conversations,
    order: sortConversations([...conversations.values()]),
  };
};

const writeMessages = (conversationId: string, messages: ChatMessageView[]) => {
  const next = new Map(state.messages);
  next.set(conversationId, order(messages));
  state = { ...state, messages: next };
};

export function setViewer(viewerId: string): void {
  if (state.viewerId === viewerId) return;
  state = { ...state, viewerId };
  notify();
}

export function setConnected(connected: boolean): void {
  if (state.connected === connected) return;
  state = { ...state, connected };
  notify();
}

export function setConversations(items: InboxItem[]): void {
  withConversations(new Map(items.map((item) => [item.id, item])));
  notify();
}

export function seedInbox(items: InboxItem[]): void {
  const presence = new Set(state.presence);
  for (const item of items)
    if (item.online && item.otherUserId) presence.add(item.otherUserId);
  state = { ...state, presence, seeded: true };
  setConversations(items);
}

export function upsertConversation(item: InboxItem): void {
  const conversations = new Map(state.conversations);
  conversations.set(item.id, item);
  withConversations(conversations);
  notify();
}

export function patchConversation(
  conversationId: string,
  patch: Partial<InboxItem>,
): void {
  const current = state.conversations.get(conversationId);
  if (!current) return;
  const conversations = new Map(state.conversations);
  conversations.set(conversationId, { ...current, ...patch });
  withConversations(conversations);
  notify();
}

export function removeConversation(conversationId: string): void {
  if (!state.conversations.has(conversationId)) return;
  const conversations = new Map(state.conversations);
  conversations.delete(conversationId);
  withConversations(conversations);
  const messages = new Map(state.messages);
  messages.delete(conversationId);
  state = { ...state, messages };
  notify();
}

export function setMessages(
  conversationId: string,
  messages: ChatMessageView[],
): void {
  writeMessages(conversationId, messages);
  notify();
}

export function prependMessages(
  conversationId: string,
  messages: ChatMessageView[],
): void {
  const current = state.messages.get(conversationId) ?? [];
  const known = new Set(current.map((message) => message.id));
  const added = messages.filter((message) => !known.has(message.id));
  if (added.length === 0) return;
  writeMessages(conversationId, [...added, ...current]);
  notify();
}

const merge = (
  current: ChatMessageView[],
  message: ChatMessageView,
): ChatMessageView[] => {
  const byId = current.findIndex((row) => row.id === message.id);
  if (byId >= 0) {
    const next = [...current];
    next[byId] = message;
    return next;
  }
  const byClientId =
    message.clientId === null
      ? -1
      : current.findIndex(
          (row) => row.seq < 0 && row.clientId === message.clientId,
        );
  if (byClientId >= 0) {
    const next = [...current];
    next[byClientId] = message;
    return next;
  }
  return [...current, message];
};

export function upsertMessage(message: ChatMessageView): void {
  const current = state.messages.get(message.conversationId);
  if (current) writeMessages(message.conversationId, merge(current, message));

  const conversation = state.conversations.get(message.conversationId);
  if (conversation && message.seq >= conversation.lastSeq) {
    const conversations = new Map(state.conversations);
    conversations.set(message.conversationId, {
      ...conversation,
      lastSeq: message.seq,
      lastMessage: message,
      lastMessageAt: message.createdAt,
    });
    withConversations(conversations);
  } else if (conversation && conversation.lastMessage?.id === message.id) {
    const conversations = new Map(state.conversations);
    conversations.set(message.conversationId, {
      ...conversation,
      lastMessage: message,
    });
    withConversations(conversations);
  }

  notify();
}

export function addOptimistic(draft: OptimisticDraft): void {
  const current = state.messages.get(draft.conversationId) ?? [];
  const row: ChatMessageView = {
    id: `optimistic:${draft.clientId}`,
    conversationId: draft.conversationId,
    seq: OPTIMISTIC_SEQ,
    senderId: draft.senderId,
    kind: "text",
    text: draft.text,
    meta: null,
    replyTo: draft.replyTo,
    clientId: draft.clientId,
    editedAt: null,
    deletedAt: null,
    createdAt: draft.createdAt,
    reactions: [],
  };
  const failed = new Set(state.failed);
  failed.delete(draft.clientId);
  state = { ...state, failed };
  writeMessages(draft.conversationId, [...current, row]);
  notify();
}

export function reconcile(clientId: string, message: ChatMessageView): void {
  const failed = new Set(state.failed);
  failed.delete(clientId);
  state = { ...state, failed };
  const current = state.messages.get(message.conversationId);
  if (current) {
    const withoutGhost = current.filter(
      (row) => !(row.seq < 0 && row.clientId === clientId),
    );
    writeMessages(message.conversationId, merge(withoutGhost, message));
  }
  notify();
}

export function markFailed(clientId: string): void {
  const failed = new Set(state.failed);
  failed.add(clientId);
  state = { ...state, failed };
  notify();
}

export function dropOptimistic(conversationId: string, clientId: string): void {
  const current = state.messages.get(conversationId);
  const failed = new Set(state.failed);
  failed.delete(clientId);
  state = { ...state, failed };
  if (current)
    writeMessages(
      conversationId,
      current.filter((row) => !(row.seq < 0 && row.clientId === clientId)),
    );
  notify();
}

export function setReactions(
  conversationId: string,
  messageId: string,
  reactions: ReactionView[],
): void {
  const current = state.messages.get(conversationId);
  if (!current) return;
  const index = current.findIndex((row) => row.id === messageId);
  if (index < 0) return;
  const next = [...current];
  next[index] = { ...next[index], reactions };
  writeMessages(conversationId, next);
  notify();
}

export function setReads(
  conversationId: string,
  entries: { userId: string; lastReadSeq: number }[],
): void {
  const reads = new Map(state.reads);
  reads.set(
    conversationId,
    new Map(entries.map(({ userId, lastReadSeq }) => [userId, lastReadSeq])),
  );
  state = { ...state, reads };
  notify();
}

const applyRead = (
  conversationId: string,
  userId: string,
  seq: number,
): void => {
  const reads = new Map(state.reads);
  const forConversation = new Map(reads.get(conversationId) ?? NO_READS);
  forConversation.set(userId, Math.max(forConversation.get(userId) ?? 0, seq));
  reads.set(conversationId, forConversation);
  state = { ...state, reads };

  if (userId !== state.viewerId) return;
  const conversation = state.conversations.get(conversationId);
  if (!conversation) return;
  const conversations = new Map(state.conversations);
  conversations.set(conversationId, {
    ...conversation,
    me: {
      ...conversation.me,
      lastReadSeq: Math.max(conversation.me.lastReadSeq, seq),
    },
  });
  withConversations(conversations);
};

export function markRead(conversationId: string, seq: number): void {
  if (!state.viewerId) return;
  applyRead(conversationId, state.viewerId, seq);
  notify();
}

const typingKey = (conversationId: string, userId: string) =>
  `${conversationId}:${userId}`;

const writeTyping = (conversationId: string, entries: Map<string, string>) => {
  const typing = new Map(state.typing);
  const typingUsers = new Map(state.typingUsers);
  if (entries.size === 0) {
    typing.delete(conversationId);
    typingUsers.delete(conversationId);
  } else {
    typing.set(conversationId, entries);
    typingUsers.set(conversationId, [...entries.keys()]);
  }
  state = { ...state, typing, typingUsers };
};

export function setTyping(
  conversationId: string,
  userId: string,
  until: string | null,
): void {
  const key = typingKey(conversationId, userId);
  const timer = typingTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    typingTimers.delete(key);
  }

  const entries = new Map(state.typing.get(conversationId) ?? []);
  if (until === null) {
    if (!entries.delete(userId)) return;
    writeTyping(conversationId, entries);
    notify();
    return;
  }

  entries.set(userId, until);
  writeTyping(conversationId, entries);
  const delay = Math.max(0, new Date(until).getTime() - Date.now());
  typingTimers.set(
    key,
    setTimeout(() => {
      typingTimers.delete(key);
      setTyping(conversationId, userId, null);
    }, delay),
  );
  notify();
}

export function setPresence(userId: string, online: boolean): void {
  if (state.presence.has(userId) === online) return;
  const presence = new Set(state.presence);
  if (online) presence.add(userId);
  else presence.delete(userId);
  state = { ...state, presence };
  notify();
}

export function seedPresence(userIds: string[]): void {
  const presence = new Set(state.presence);
  for (const userId of userIds) presence.add(userId);
  state = { ...state, presence };
  notify();
}

export function setDraft(conversationId: string, text: string): void {
  const drafts = new Map(state.drafts);
  if (text) drafts.set(conversationId, text);
  else drafts.delete(conversationId);
  state = { ...state, drafts };
  notify();
}

export function applyEvent(event: RealtimeEvent): void {
  switch (event.type) {
    case "message.created":
    case "message.updated":
      upsertMessage(event.message);
      return;
    case "reaction.changed":
      setReactions(event.conversationId, event.messageId, event.reactions);
      return;
    case "conversation.updated": {
      const current = state.conversations.get(event.conversationId);
      if (!current) return;
      patchConversation(event.conversationId, {
        ...(event.patch.title !== undefined
          ? { title: event.patch.title }
          : {}),
        ...(event.patch.announcementOnly !== undefined
          ? { announcementOnly: event.patch.announcementOnly }
          : {}),
        ...(event.patch.frozenAt !== undefined
          ? { frozenAt: event.patch.frozenAt }
          : {}),
        ...(event.patch.memberCount !== undefined
          ? { memberCount: event.patch.memberCount }
          : {}),
      });
      return;
    }
    case "conversation.created":
      return;
    case "member.left": {
      if (event.userId === state.viewerId) {
        removeConversation(event.conversationId);
        return;
      }
      const current = state.conversations.get(event.conversationId);
      if (!current) return;
      patchConversation(event.conversationId, {
        memberCount: Math.max(0, current.memberCount - 1),
      });
      return;
    }
    case "read":
      applyRead(event.conversationId, event.userId, event.seq);
      notify();
      return;
    case "typing":
      setTyping(
        event.conversationId,
        event.userId,
        event.typing ? event.until : null,
      );
      return;
    case "presence":
      setPresence(event.userId, event.online);
      return;
  }
}

export function resetChatStore(): void {
  for (const timer of typingTimers.values()) clearTimeout(timer);
  typingTimers.clear();
  state = emptyState();
  notify();
}

export const snapshot = (): ChatState => state;

export const getDraft = (conversationId: string): string =>
  state.drafts.get(conversationId) ?? "";

const serverSnapshot = emptyState();

const useSlice = <T>(select: (value: ChatState) => T): T =>
  useSyncExternalStore(
    subscribe,
    () => select(state),
    () => select(serverSnapshot),
  );

export const useChatConnected = (): boolean =>
  useSlice((value) => value.connected);

export const useConversations = (
  initial: InboxItem[] = NO_CONVERSATIONS,
): InboxItem[] => useSlice((value) => (value.seeded ? value.order : initial));

export const useConversation = (
  conversationId: string,
): InboxItem | undefined =>
  useSlice((value) => value.conversations.get(conversationId));

export const useMessages = (
  conversationId: string,
  initial: ChatMessageView[] = NO_MESSAGES,
): ChatMessageView[] =>
  useSlice((value) => value.messages.get(conversationId) ?? initial);

export const useTypingUsers = (conversationId: string): string[] =>
  useSlice((value) => value.typingUsers.get(conversationId) ?? NO_USERS);

export const useIsOnline = (userId: string | null, fallback = false): boolean =>
  useSlice((value) => {
    if (userId === null) return false;
    return value.seeded ? value.presence.has(userId) : fallback;
  });

export const useReads = (
  conversationId: string,
  initial: Map<string, number> = NO_READS,
): Map<string, number> =>
  useSlice((value) => value.reads.get(conversationId) ?? initial);

export const useDraft = (conversationId: string): string =>
  useSlice((value) => value.drafts.get(conversationId) ?? "");

export const useFailed = (clientId: string | null): boolean =>
  useSlice((value) => (clientId === null ? false : value.failed.has(clientId)));
