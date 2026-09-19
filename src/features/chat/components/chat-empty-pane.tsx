import { MessagesSquare } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import type { ChatListStrings } from "./strings";

export const chatIllustration = (name: string, enabled: boolean) =>
  enabled ? `/illustrations/chat/${name}.svg` : undefined;

export function ChatEmptyPane({
  strings,
  illustrations = false,
}: {
  strings: ChatListStrings;
  illustrations?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
      <EmptyState
        icon={MessagesSquare}
        illustration={chatIllustration("select-conversation", illustrations)}
        title={strings.pane.title}
        className="border-none"
      >
        {strings.pane.body}
      </EmptyState>
    </div>
  );
}
