"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import Link from "next/link";
import { ArrowDown, ChevronLeft, Megaphone } from "lucide-react";
import type { MarkdownToolLabels } from "@/components/markdown-editor";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { formatDate, type Locale } from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import { loadMessagesAction, markReadAction } from "../actions";
import type { ChatMessageView } from "../schemas";
import { ChatAvatar } from "./chat-avatar";
import { ChatComposer } from "./chat-composer";
import { RelativeTime } from "./local-time";
import {
  markRead,
  prependMessages,
  setMessages,
  setReads,
  useChatConnected,
  useConversation,
  useFailed,
  useIsOnline,
  useMessages,
  useReads,
  useTypingUsers,
} from "./chat-store";
import { MessageRow } from "./message-row";
import { resendChatMessage } from "./send-message";
import type { ChatStrings } from "./strings";
import { TypingIndicator } from "./typing-indicator";
import type { ConversationView } from "./types";

const GROUP_WINDOW_MS = 5 * 60_000;

const dayKey = (iso: string) => iso.slice(0, 10);

const sameBlock = (a: ChatMessageView, b: ChatMessageView) =>
  a.kind === "text" &&
  b.kind === "text" &&
  a.senderId === b.senderId &&
  dayKey(a.createdAt) === dayKey(b.createdAt) &&
  Math.abs(new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) <
    GROUP_WINDOW_MS;

function FailedRow({
  message,
  ...rest
}: Omit<ComponentProps<typeof MessageRow>, "failed">) {
  const failed = useFailed(message.clientId);

  return (
    <MessageRow
      message={message}
      failed={failed}
      {...rest}
    />
  );
}

export function ConversationThread({
  view,
  home,
  strings,
  markdown,
  language,
  notation,
}: {
  view: ConversationView;
  home: string;
  strings: ChatStrings;
  markdown: MarkdownToolLabels;
  language: string;
  notation: Locale;
}) {
  const conversationId = view.conversation.id;
  const viewerId = view.viewerId;

  const initialReads = useMemo(
    () =>
      new Map(
        view.members.map((member) => [member.userId, member.lastReadSeq]),
      ),
    [view.members],
  );

  const live = useConversation(conversationId);
  const conversation = live ?? view.conversation;
  const messages = useMessages(conversationId, view.messages);
  const reads = useReads(conversationId, initialReads);
  const typingUserIds = useTypingUsers(conversationId);
  const connected = useChatConnected();
  const peerOnline = useIsOnline(
    view.conversation.otherUserId,
    view.members.find(
      (member) => member.userId === view.conversation.otherUserId,
    )?.online ?? false,
  );

  const [replyTo, setReplyTo] = useState<ChatMessageView | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const people = useMemo(
    () => new Map(view.members.map((member) => [member.userId, member])),
    [view.members],
  );

  const nameOf = (userId: string | null) =>
    userId === null
      ? strings.deletedAccount
      : (people.get(userId)?.name ?? strings.deletedAccount);

  useEffect(() => {
    setMessages(conversationId, view.messages);
    setReads(
      conversationId,
      view.members.map((member) => ({
        userId: member.userId,
        lastReadSeq: member.lastReadSeq,
      })),
    );
  }, [conversationId, view.messages, view.members]);

  const lastSeq = messages.reduce(
    (highest, message) => Math.max(highest, message.seq),
    0,
  );

  useEffect(() => {
    if (lastSeq <= 0) return;
    markRead(conversationId, lastSeq);
    void markReadAction({ conversationId, seq: lastSeq });
  }, [conversationId, lastSeq]);

  const oldestSeq = messages.find((message) => message.seq > 0)?.seq ?? 0;
  const hasOlder = oldestSeq > 1;

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasOlder) return;

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setLoadingOlder(true);
      void loadMessagesAction({ conversationId, beforeSeq: oldestSeq })
        .then((result) => {
          if (result.ok) prependMessages(conversationId, result.messages);
        })
        .finally(() => setLoadingOlder(false));
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [conversationId, oldestSeq, hasOlder]);

  const others = view.members.filter((member) => member.userId !== viewerId);
  const lastOwn = [...messages]
    .reverse()
    .find((message) => message.senderId === viewerId && message.seq > 0);

  const receiptFor = (message: ChatMessageView) => {
    if (message.senderId !== viewerId || others.length === 0)
      return { receipt: null, seenByEveryone: false };
    const seen = others.filter(
      (member) => (reads.get(member.userId) ?? 0) >= message.seq,
    ).length;
    return {
      receipt:
        lastOwn?.id === message.id && seen > 0
          ? conversation.kind === "direct"
            ? strings.thread.seen
            : formatMessage(strings.thread.seenBy, { count: seen }, language)
          : null,
      seenByEveryone: seen === others.length,
    };
  };

  const typingNames = typingUserIds
    .filter((userId) => userId !== viewerId)
    .map((userId) => nameOf(userId));

  const frozenAt = conversation.frozenAt;
  const locked =
    conversation.announcementOnly && conversation.me.role !== "owner";

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-canvas md:static md:z-auto md:min-h-0 md:w-full md:flex-1">
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 md:pt-3">
        <Link
          href={`${home}/chat`}
          aria-label={strings.thread.back}
          className="-ml-2 grid size-9 place-items-center rounded-full text-ink-soft hover:bg-canvas-deep hover:text-ink md:hidden"
        >
          <ChevronLeft className="size-5" />
        </Link>

        <ChatAvatar
          svg={view.display.avatarSvg}
          online={peerOnline}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold text-ink">
            {view.display.name || strings.deletedAccount}
          </span>
          <span className="truncate text-xs text-ink-soft">
            {conversation.kind === "direct"
              ? peerOnline
                ? strings.thread.online
                : strings.thread.offline
              : formatMessage(
                  strings.newChat.people,
                  { count: conversation.memberCount },
                  language,
                )}
          </span>
        </div>
      </header>

      {!connected ? (
        <Marker className="shrink-0 bg-canvas-deep px-4 py-1.5 text-2sm">
          <MarkerContent>{strings.thread.reconnecting}</MarkerContent>
        </Marker>
      ) : null}

      <MessageScrollerProvider
        defaultScrollPosition="end"
        autoScroll
      >
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport className="px-4">
            <MessageScrollerContent className="gap-0 py-4">
              <div
                ref={sentinel}
                aria-hidden
                className="h-px shrink-0"
              />

              {loadingOlder ? (
                <Marker
                  variant="separator"
                  className="mb-3"
                >
                  <MarkerContent>{strings.thread.loadOlder}</MarkerContent>
                </Marker>
              ) : null}

              {messages.map((message, index) => {
                const previous = messages[index - 1];
                const next = messages[index + 1];
                const newDay =
                  !previous ||
                  dayKey(previous.createdAt) !== dayKey(message.createdAt);

                if (message.kind === "system")
                  return (
                    <MessageScrollerItem
                      key={message.id}
                      messageId={message.id}
                      className={cn("flex flex-col", index > 0 && "mt-3")}
                    >
                      {newDay ? (
                        <Marker
                          variant="separator"
                          className="mb-3"
                        >
                          <MarkerContent>
                            {formatDate(message.createdAt, notation)}
                          </MarkerContent>
                        </Marker>
                      ) : null}
                      <Marker className="justify-center text-2sm">
                        <MarkerContent className="text-center">
                          {message.meta
                            ? formatMessage(
                                strings.system[message.meta.type],
                                { name: nameOf(message.meta.actorUserId) },
                                language,
                              )
                            : ""}
                        </MarkerContent>
                      </Marker>
                    </MessageScrollerItem>
                  );

                const own = message.senderId === viewerId;
                const sender = message.senderId
                  ? people.get(message.senderId)
                  : undefined;
                const groupedWithPrevious =
                  previous !== undefined && sameBlock(previous, message);
                const groupedWithNext =
                  next !== undefined && sameBlock(message, next);
                const { receipt, seenByEveryone } = receiptFor(message);

                return (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={message.id}
                    className={cn(
                      "flex flex-col",
                      index > 0 && (groupedWithPrevious ? "mt-0.5" : "mt-3"),
                    )}
                  >
                    {newDay ? (
                      <Marker
                        variant="separator"
                        className="mb-3"
                      >
                        <MarkerContent>
                          {formatDate(message.createdAt, notation)}
                        </MarkerContent>
                      </Marker>
                    ) : null}

                    <FailedRow
                      message={message}
                      own={own}
                      senderName={sender?.name ?? strings.deletedAccount}
                      senderAvatarSvg={sender?.avatarSvg ?? null}
                      showAvatar={!groupedWithNext}
                      showName={
                        conversation.kind === "group" &&
                        !own &&
                        !groupedWithPrevious
                      }
                      receipt={receipt}
                      seenByEveryone={seenByEveryone}
                      replyName={
                        message.replyTo
                          ? nameOf(message.replyTo.senderId)
                          : null
                      }
                      onReply={setReplyTo}
                      onRetry={(failedMessage) =>
                        void resendChatMessage(failedMessage, viewerId)
                      }
                      strings={strings}
                      notation={notation}
                    />
                  </MessageScrollerItem>
                );
              })}

              {typingNames.length > 0 ? (
                <TypingIndicator
                  names={typingNames}
                  strings={strings.thread}
                  language={language}
                  showNames={conversation.kind === "group"}
                />
              ) : null}
            </MessageScrollerContent>
          </MessageScrollerViewport>

          <MessageScrollerButton>
            <ArrowDown aria-hidden />
            <span className="sr-only">{strings.thread.jumpToLatest}</span>
          </MessageScrollerButton>
        </MessageScroller>
      </MessageScrollerProvider>

      {frozenAt ? (
        <div className="shrink-0 border-t border-line bg-canvas-deep px-4 py-3">
          <p className="flex items-baseline gap-2 text-sm font-medium text-ink">
            {strings.thread.frozen.title}
            <RelativeTime
              value={frozenAt}
              words={language}
              className="text-xs font-normal text-ink-faint"
            />
          </p>
          <p className="text-2sm text-ink-soft">{strings.thread.frozen.body}</p>
        </div>
      ) : null}

      {locked ? (
        <Marker className="shrink-0 border-t border-line px-4 py-4 text-2sm">
          <MarkerIcon>
            <Megaphone />
          </MarkerIcon>
          <MarkerContent>{strings.thread.announcementLocked}</MarkerContent>
        </Marker>
      ) : (
        <ChatComposer
          key={conversationId}
          conversationId={conversationId}
          senderId={viewerId}
          replyTo={replyTo}
          replyName={replyTo ? nameOf(replyTo.senderId) : null}
          onCancelReply={() => setReplyTo(null)}
          disabled={frozenAt !== null}
          strings={strings.composer}
          markdown={markdown}
          errors={strings.errors}
          language={language}
        />
      )}
    </div>
  );
}
