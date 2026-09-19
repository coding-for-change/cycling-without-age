import { Suspense } from "react";
import { ThreadSkeleton } from "@/features/chat/components/chat-skeletons";
import { AdminChatThread } from "../_components/admin-chat-shell";

export default function AdminConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  return (
    <Suspense fallback={<ThreadSkeleton />}>
      <AdminChatThread params={params} />
    </Suspense>
  );
}
