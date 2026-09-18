import { Suspense, type ReactNode } from "react";
import { ChatListSkeleton } from "@/features/chat/components/chat-skeletons";
import { MemberChatShell } from "../../_components/chat-shell";

export default function PilotChatLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ChatListSkeleton />}>
      <MemberChatShell perspective="pilot">{children}</MemberChatShell>
    </Suspense>
  );
}
