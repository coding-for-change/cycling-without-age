import { Suspense } from "react";
import { MemberChatPane } from "../../_components/chat-shell";

export default function PassengerChatPage() {
  return (
    <Suspense fallback={null}>
      <MemberChatPane perspective="passenger" />
    </Suspense>
  );
}
