"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { useDrawerParam } from "@/hooks/use-drawer-param";
import type { Locale } from "@/lib/format";
import { cn } from "@/lib/utils";
import { seedInbox } from "./chat-store";
import { ConversationList } from "./conversation-list";
import { NewChatDrawer } from "./new-chat-drawer";
import { ChatRealtimeProvider } from "./realtime-provider";
import type { ChatStrings } from "./strings";
import type { InboxItem } from "./types";

export function ChatLayout({
  home,
  viewerId,
  inbox,
  chapters,
  strings,
  language,
  notation,
  renderedAt,
  illustrations = false,
  children,
}: {
  home: string;
  viewerId: string;
  inbox: InboxItem[];
  chapters: { id: string; name: string }[];
  strings: ChatStrings;
  language: string;
  notation: Locale;
  renderedAt: string;
  illustrations?: boolean;
  children: ReactNode;
}) {
  const segment = useSelectedLayoutSegment();
  const [query, setQuery] = useState("");
  const [unreadsOnly, setUnreadsOnly] = useState(false);
  const { openHref } = useDrawerParam();

  useEffect(() => {
    seedInbox(inbox);
  }, [inbox]);

  return (
    <ChatRealtimeProvider
      viewerId={viewerId}
      focusConversationId={segment}
      renderedAt={renderedAt}
    >
      <div className="flex min-h-0 w-full flex-1 overflow-hidden md:h-[calc(100dvh-5rem)] md:flex-none">
        <div
          className={cn(
            "min-h-0 w-full shrink-0 flex-col border-line md:flex md:w-[350px] md:border-r",
            segment ? "hidden" : "flex",
          )}
        >
          <div className="flex shrink-0 flex-col gap-3 px-4 pt-4 pb-3">
            <div className="flex items-center gap-3">
              <h1 className="min-w-0 flex-1 truncate text-base font-semibold">
                {strings.list.title}
              </h1>
              <label className="flex items-center gap-2 text-2sm text-ink-soft">
                {strings.list.unreads}
                <Switch
                  checked={unreadsOnly}
                  onCheckedChange={setUnreadsOnly}
                />
              </label>
              <Button
                asChild
                size="sm"
                variant="outline"
              >
                <Link href={openHref}>
                  <Plus aria-hidden />
                  {strings.list.newChat}
                </Link>
              </Button>
            </div>

            <InputGroup>
              <InputGroupAddon>
                <Search aria-hidden />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={strings.list.search}
                aria-label={strings.list.search}
              />
            </InputGroup>
          </div>

          <ConversationList
            initial={inbox}
            viewerId={viewerId}
            home={home}
            activeId={segment}
            query={query}
            unreadsOnly={unreadsOnly}
            strings={strings}
            language={language}
            notation={notation}
            illustrations={illustrations}
          />
        </div>

        <div
          className={cn(
            "min-h-0 min-w-0 flex-1 flex-col md:flex",
            segment ? "flex" : "hidden",
          )}
        >
          {children}
        </div>
      </div>

      <NewChatDrawer
        home={home}
        chapters={chapters}
        strings={strings.newChat}
        errors={strings.errors}
      />
    </ChatRealtimeProvider>
  );
}
