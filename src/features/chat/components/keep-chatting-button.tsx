"use client";

import { useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { notify } from "@/components/action-feedback";
import { Button } from "@/components/ui/button";
import { continueConversationAction } from "../actions";
import type { ChatStrings } from "./strings";

/**
 * CHAT-PLAN 2.3: a chat that wrapped up with its ride opens again for
 * everyone in it. The store hears the change from the stream.
 */
export function KeepChattingButton({
  conversationId,
  strings,
}: {
  conversationId: string;
  strings: ChatStrings;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="brand"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await continueConversationAction({ conversationId });
          notify(result, {
            done: strings.thread.frozen.continued,
            errors: strings.errors,
          });
        })
      }
      className="min-h-11 rounded-full"
    >
      <MessageCircle aria-hidden />
      {strings.thread.frozen.keepChatting}
    </Button>
  );
}
