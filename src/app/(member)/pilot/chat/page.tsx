import { Suspense } from "react";
import { MemberChatPane } from "../../_components/chat-shell";

export default function PilotChatPage() {
  return (
    <Suspense fallback={null}>
      <MemberChatPane perspective="pilot" />
    </Suspense>
  );
}
