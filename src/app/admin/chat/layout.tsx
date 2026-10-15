import { Suspense, type ReactNode } from "react";
import { ChatListSkeleton } from "@/features/chat/components/chat-skeletons";
import { AdminChatChrome } from "./_components/admin-chat-chrome";
import { AdminChatShell } from "./_components/admin-chat-shell";

export default function AdminChatLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <Suspense fallback={<ChatListSkeleton />}>
          <AdminChatChrome />
        </Suspense>
      }
    >
      <AdminChatShell>{children}</AdminChatShell>
    </Suspense>
  );
}
