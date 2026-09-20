"use client";

import Link from "next/link";
import { BellOff } from "lucide-react";
import { formatBadge } from "@/components/notifications/inbox-row";
import { formatDate, type Locale } from "@/lib/format";
import { cn, fill } from "@/lib/utils";
import { ChatAvatar } from "./chat-avatar";
import { RelativeTime } from "./local-time";
import { previewLine } from "./preview";
import type { ChatStrings } from "./strings";
import type { InboxItem } from "./types";

export function conversationPreview(
  item: InboxItem,
  viewerId: string,
  strings: ChatStrings,
): string {
  const message = item.lastMessage;
  if (!message) return "";

  if (message.kind === "system") {
    if (!message.meta) return "";
    const actor =
      message.meta.actorUserId === viewerId ? strings.list.you : null;
    if (!actor) return "";
    return fill(strings.system[message.meta.type], { name: actor });
  }

  if (message.deletedAt) return strings.thread.deleted;

  const mine = message.senderId === viewerId;
  const prefix = mine
    ? strings.list.you
    : item.kind === "group"
      ? item.lastMessageSenderName
      : null;

  return previewLine(message.text, prefix);
}

export function ConversationRow({
  item,
  viewerId,
  home,
  active,
  strings,
  language,
  notation,
}: {
  item: InboxItem;
  viewerId: string;
  home: string;
  active: boolean;
  strings: ChatStrings;
  language: string;
  notation: Locale;
}) {
  const unread = Math.max(0, item.lastSeq - item.me.lastReadSeq);
  const muted = item.me.mutedUntil !== null;
  const preview = conversationPreview(item, viewerId, strings);

  return (
    <Link
      href={`${home}/chat/${item.id}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-start gap-3 rounded-lg px-3 py-3 transition-colors",
        active ? "bg-canvas-deep" : "hover:bg-canvas-deep/60",
      )}
    >
      <ChatAvatar
        svg={item.display.avatarSvg}
        online={item.online}
        size="lg"
      />

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline gap-3">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
            {item.display.name || strings.deletedAccount}
          </span>
          {item.lastMessageAt ? (
            <RelativeTime
              value={item.lastMessageAt}
              words={language}
              title={formatDate(item.lastMessageAt, notation)}
              className="shrink-0 text-xs text-ink-faint"
            />
          ) : null}
        </span>

        <span className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-2sm text-ink-soft">
            {preview}
          </span>
          {muted ? (
            <BellOff
              aria-label={strings.list.mutedLabel}
              className="size-3.5 shrink-0 text-ink-faint"
            />
          ) : null}
          {unread > 0 ? (
            <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-mint-deep px-1.5 text-xs font-medium text-white">
              {formatBadge(unread)}
            </span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}
