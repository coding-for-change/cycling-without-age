"use client";

import Link from "next/link";
import { MessageSquarePlus, SearchX } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useDrawerParam } from "@/hooks/use-drawer-param";
import { chatIllustration } from "./chat-empty-pane";
import type { ChatListStrings } from "./strings";

export function ChatEmptyList({
  strings,
  illustrations = false,
}: {
  strings: ChatListStrings;
  illustrations?: boolean;
}) {
  const { openHref } = useDrawerParam();

  return (
    <EmptyState
      icon={MessageSquarePlus}
      illustration={chatIllustration("no-conversations", illustrations)}
      title={strings.empty.title}
      className="border-none"
      action={
        <Button
          asChild
          variant="brand"
        >
          <Link href={openHref}>{strings.empty.cta}</Link>
        </Button>
      }
    >
      {strings.empty.body}
    </EmptyState>
  );
}

export function ChatSearchEmpty({
  strings,
  illustrations = false,
}: {
  strings: ChatListStrings;
  illustrations?: boolean;
}) {
  return (
    <EmptyState
      icon={SearchX}
      illustration={chatIllustration("no-results", illustrations)}
      title={strings.noResults}
      className="border-none"
    >
      {strings.search}
    </EmptyState>
  );
}
