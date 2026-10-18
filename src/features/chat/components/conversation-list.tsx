"use client";

import type { Locale } from "@/lib/format";
import { useConversations } from "./chat-store";
import { ChatEmptyList, ChatSearchEmpty } from "./chat-empty-list";
import { ConversationRow } from "./conversation-row";
import type { ChatStrings } from "./strings";
import type { InboxItem } from "./types";
import { PERSPECTIVE_HOME } from "@/lib/redirects";
import { cn } from "@/lib/utils";

export function filterConversations(
  items: InboxItem[],
  { query, unreadsOnly }: { query: string; unreadsOnly: boolean },
): InboxItem[] {
  const needle = query.trim().toLowerCase();

  return items.filter((item) => {
    if (unreadsOnly && item.lastSeq <= item.me.lastReadSeq) return false;
    if (!needle) return true;
    const haystack = `${item.display.name} ${item.title ?? ""}`.toLowerCase();
    return haystack.includes(needle);
  });
}

export function ConversationList({
  initial,
  viewerId,
  home,
  activeId,
  query,
  unreadsOnly,
  strings,
  language,
  notation,
  illustrations = false,
}: {
  initial: InboxItem[];
  viewerId: string;
  home: string;
  activeId: string | null;
  query: string;
  unreadsOnly: boolean;
  strings: ChatStrings;
  language: string;
  notation: Locale;
  illustrations?: boolean;
}) {
  const conversations = useConversations(initial);
  const rows = filterConversations(conversations, { query, unreadsOnly });
  const cards = home === PERSPECTIVE_HOME.passenger;

  if (conversations.length === 0)
    return (
      <div className="flex min-h-0 flex-1 items-start justify-center px-3 pt-8">
        <ChatEmptyList
          strings={strings.list}
          illustrations={illustrations}
          hero={cards ? "chat" : undefined}
        />
      </div>
    );

  if (rows.length === 0)
    return (
      <div className="flex min-h-0 flex-1 items-start justify-center px-3 pt-8">
        <ChatSearchEmpty
          strings={strings.list}
          illustrations={illustrations}
        />
      </div>
    );

  return (
    <div className="min-h-0 flex-1 scrollbar-thin overflow-y-auto overscroll-contain px-2 pb-4">
      <ul className={cn("flex flex-col", cards ? "gap-2 pt-1" : "gap-0.5")}>
        {rows.map((item) => (
          <li key={item.id}>
            <ConversationRow
              item={item}
              viewerId={viewerId}
              home={home}
              active={item.id === activeId}
              strings={strings}
              language={language}
              notation={notation}
              card={cards}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
