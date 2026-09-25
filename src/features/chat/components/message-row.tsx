"use client";

import { useRef, useState, type PointerEvent } from "react";
import { Check, CheckCheck, Reply } from "lucide-react";
import { RichText } from "@/components/markdown";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message";
import { useMessageScroller } from "@/components/ui/message-scroller";
import { haptics } from "@/lib/native/haptics";
import type { Locale } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ChatMessageView } from "../schemas";
import { ChatAvatar } from "./chat-avatar";
import { LocalTime } from "./local-time";
import { stripPreview } from "./preview";
import type { ChatStrings } from "./strings";

const SWIPE_INTENT_PX = 8;
const SWIPE_MAX_PX = 72;
const SWIPE_ARM_PX = 56;

export function MessageRow({
  message,
  own,
  senderName,
  senderAvatarSvg,
  showAvatar,
  showName,
  receipt,
  seenByEveryone,
  failed,
  replyName,
  onReply,
  onRetry,
  strings,
  notation,
}: {
  message: ChatMessageView;
  own: boolean;
  senderName: string | null;
  senderAvatarSvg: string | null;
  showAvatar: boolean;
  showName: boolean;
  receipt: string | null;
  seenByEveryone: boolean;
  failed: boolean;
  replyName: string | null;
  onReply: (message: ChatMessageView) => void;
  onRetry: (message: ChatMessageView) => void;
  strings: ChatStrings;
  notation: Locale;
}) {
  const { scrollToMessage } = useMessageScroller();
  const [offset, setOffset] = useState(0);
  const armed = useRef(false);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const horizontal = useRef(false);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    origin.current = { x: event.clientX, y: event.clientY };
    horizontal.current = false;
    armed.current = false;
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = origin.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    if (!horizontal.current) {
      if (Math.abs(dy) > SWIPE_INTENT_PX && Math.abs(dy) > Math.abs(dx)) {
        origin.current = null;
        return;
      }
      if (dx <= SWIPE_INTENT_PX) return;
      horizontal.current = true;
    }

    const next = Math.min(SWIPE_MAX_PX, Math.max(0, dx - SWIPE_INTENT_PX));
    setOffset(next);
    if (next >= SWIPE_ARM_PX && !armed.current) {
      armed.current = true;
      haptics.tap();
    }
    if (next < SWIPE_ARM_PX) armed.current = false;
  };

  const onPointerEnd = () => {
    if (armed.current) onReply(message);
    armed.current = false;
    horizontal.current = false;
    origin.current = null;
    setOffset(0);
  };

  const deleted = message.deletedAt !== null;
  const pending = message.seq < 0;
  const quoted = message.replyTo;

  return (
    <div className="group/row relative">
      <span
        aria-hidden
        style={{ opacity: Math.min(1, offset / SWIPE_ARM_PX) }}
        className="pointer-events-none absolute inset-y-0 left-0 flex items-center text-ink-faint"
      >
        <Reply className="size-4" />
      </span>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        style={{ transform: `translateX(${offset}px)` }}
        className={cn(
          "touch-pan-y",
          offset === 0 &&
            "transition-transform duration-200 motion-reduce:transition-none",
        )}
      >
        <Message align={own ? "end" : "start"}>
          <MessageAvatar
            className={cn("bg-transparent", !showAvatar && "invisible")}
          >
            <ChatAvatar svg={senderAvatarSvg} />
          </MessageAvatar>

          <MessageContent>
            {showName && senderName ? (
              <MessageHeader>{senderName}</MessageHeader>
            ) : null}

            <Bubble
              variant={own ? "default" : "secondary"}
              className={cn(
                own
                  ? "*:data-[slot=bubble-content]:bg-mint-deep *:data-[slot=bubble-content]:text-white"
                  : "*:data-[slot=bubble-content]:bg-canvas-deep *:data-[slot=bubble-content]:text-ink",
                pending && "opacity-70",
              )}
            >
              <BubbleContent
                className={cn(
                  "rounded-[1.25rem] px-3 py-1.5 leading-normal",
                  own && "[&_a]:text-white [&_a]:underline",
                  "[&_code]:bg-current/10",
                )}
              >
                {quoted ? (
                  <button
                    type="button"
                    onClick={() => scrollToMessage(quoted.id)}
                    className="mb-1 block w-full border-l-2 border-current/40 pl-2 text-left text-2sm opacity-80"
                  >
                    <span className="block font-medium">{replyName}</span>
                    <span className="block truncate">
                      {stripPreview(quoted.text, 80)}
                    </span>
                  </button>
                ) : null}

                <div className="flex flex-wrap items-end justify-end gap-x-2">
                  <div className="min-w-0">
                    {deleted ? (
                      <span className="italic opacity-70">
                        {strings.thread.deleted}
                      </span>
                    ) : (
                      <RichText
                        text={message.text}
                        variant="chat"
                      />
                    )}
                  </div>
                  <span className="ml-auto flex shrink-0 items-center gap-1 text-xs leading-4 opacity-70 select-none">
                    {message.editedAt ? (
                      <span>{strings.thread.edited}</span>
                    ) : null}
                    <LocalTime
                      value={message.createdAt}
                      notation={notation}
                    />
                    {own && !pending && !failed ? (
                      <span
                        title={receipt ?? undefined}
                        aria-label={receipt ?? undefined}
                        className="inline-flex"
                      >
                        {seenByEveryone ? (
                          <CheckCheck className="size-3.5" />
                        ) : (
                          <Check className="size-3.5" />
                        )}
                      </span>
                    ) : null}
                  </span>
                </div>
              </BubbleContent>
            </Bubble>

            {failed ? (
              <MessageFooter className="gap-1.5 text-ink-faint">
                <span className="text-red">{strings.composer.notSent}</span>
                <button
                  type="button"
                  onClick={() => onRetry(message)}
                  className="underline underline-offset-2"
                >
                  {strings.composer.retry}
                </button>
              </MessageFooter>
            ) : null}
          </MessageContent>

          <div
            className={cn(
              "absolute top-1 opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100",
              own ? "right-full mr-1" : "left-full ml-1",
            )}
          >
            <button
              type="button"
              onClick={() => onReply(message)}
              aria-label={strings.composer.reply}
              className="hidden size-7 place-items-center rounded-full text-ink-soft hover:bg-canvas-deep hover:text-ink md:grid"
            >
              <Reply className="size-4" />
            </button>
          </div>
        </Message>
      </div>
    </div>
  );
}
