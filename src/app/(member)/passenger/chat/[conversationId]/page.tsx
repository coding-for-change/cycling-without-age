import { Suspense } from "react";
import { ThreadSkeleton } from "@/features/chat/components/chat-skeletons";
import { MemberChatThread } from "../../../_components/chat-shell";

export default function PassengerConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  return (
    <Suspense fallback={<ThreadSkeleton />}>
      <MemberChatThread
        perspective="passenger"
        params={params}
      />
    </Suspense>
  );
}
