import type { ReactNode } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ChatEmptyPane } from "@/features/chat/components/chat-empty-pane";
import { ChatLayout } from "@/features/chat/components/chat-layout";
import { markdownToolLabels } from "@/components/markdown-editor";
import { ConversationThread } from "@/features/chat/components/conversation-thread";
import { requireAdminScope } from "@/lib/auth-guards";
import { resolveLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { getInbox } from "@/use-cases/chat/chat-inbox";
import { getConversationView } from "@/use-cases/chat/conversation-view";

const HOME = "/admin";

export async function AdminChatShell({ children }: { children: ReactNode }) {
  const { session, scope } = await requireAdminScope();
  const userId = session.user.id;

  const [inbox, dict, language, head] = await Promise.all([
    getInbox(userId),
    getDictionary(),
    getLocale(),
    headers(),
  ]);

  return (
    <ChatLayout
      home={HOME}
      viewerId={userId}
      inbox={inbox}
      chapters={scope.chapters.map(({ id, name }) => ({ id, name }))}
      strings={dict.chat}
      language={language}
      notation={resolveLocale(head.get("accept-language"))}
      renderedAt={new Date().toISOString()}
    >
      {children}
    </ChatLayout>
  );
}

export async function AdminChatPane() {
  await requireAdminScope();
  const dict = await getDictionary();

  return <ChatEmptyPane strings={dict.chat.list} />;
}

export async function AdminChatThread({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const [{ conversationId }, { session }] = await Promise.all([
    params,
    requireAdminScope(),
  ]);

  const [view, dict, language, head] = await Promise.all([
    getConversationView(conversationId, session.user.id),
    getDictionary(),
    getLocale(),
    headers(),
  ]);

  if (!view) notFound();

  return (
    <ConversationThread
      view={view}
      home={HOME}
      strings={dict.chat}
      markdown={markdownToolLabels(dict)}
      language={language}
      notation={resolveLocale(head.get("accept-language"))}
    />
  );
}
