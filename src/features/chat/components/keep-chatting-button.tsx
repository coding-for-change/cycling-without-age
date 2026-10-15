"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { notify } from "@/components/action-feedback";
import { Button } from "@/components/ui/button";
import { continueConversationAction } from "../actions";
import { patchConversation } from "./chat-store";
import type { ChatStrings } from "./strings";

/**
 * CHAT-PLAN 2.3: a chat that wrapped up with its ride opens again for
 * everyone in it. The others hear it from the stream; this screen opens at
 * once, even when its stream is down.
 */
export function KeepChattingButton({
  conversationId,
  strings,
}: {
  conversationId: string;
  strings: ChatStrings;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
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
          if (!result.ok) return;
          patchConversation(conversationId, { frozenAt: null });
          router.refresh();
        })
      }
      className="min-h-11 w-full rounded-full sm:w-auto"
    >
      <MessageCircle aria-hidden />
      {strings.thread.frozen.keepChatting}
    </Button>
  );
}
