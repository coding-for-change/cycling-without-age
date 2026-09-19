import { Suspense, type ReactNode } from "react";
import { ChatListSkeleton } from "@/features/chat/components/chat-skeletons";
import { AdminChatShell } from "./_components/admin-chat-shell";

export default function AdminChatLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ChatListSkeleton />}>
      <AdminChatShell>{children}</AdminChatShell>
    </Suspense>
  );
}
