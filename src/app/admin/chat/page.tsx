import { Suspense } from "react";
import { AdminChatPane } from "./_components/admin-chat-shell";

export default function AdminChatPage() {
  return (
    <Suspense fallback={null}>
      <AdminChatPane />
    </Suspense>
  );
}
