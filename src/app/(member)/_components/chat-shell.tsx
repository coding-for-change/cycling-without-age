import type { ReactNode } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { chapters } from "@/features/chapters";
import { ChatEmptyPane } from "@/features/chat/components/chat-empty-pane";
import { ChatLayout } from "@/features/chat/components/chat-layout";
import { ConversationThread } from "@/features/chat/components/conversation-thread";
import { membership } from "@/features/membership";
import { requirePerspective } from "@/lib/auth-guards";
import { resolveLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { PERSPECTIVE_HOME } from "@/lib/redirects";
import { getInbox } from "@/use-cases/chat/chat-inbox";
import { getConversationView } from "@/use-cases/chat/conversation-view";
import type { MemberPerspective } from "../nav";

export async function MemberChatShell({
  perspective,
  children,
}: {
  perspective: MemberPerspective;
  children: ReactNode;
}) {
  const session = await requirePerspective(perspective);
  const userId = session.user.id;

  const [inbox, dict, language, head, memberships] = await Promise.all([
    getInbox(userId),
    getDictionary(),
    getLocale(),
    headers(),
    membership.listMembershipsOfUser(userId),
  ]);

  const rooms = await chapters.getChapters(
    memberships.map((row) => row.chapterId),
  );

  return (
    <ChatLayout
      home={PERSPECTIVE_HOME[perspective]}
      viewerId={userId}
      inbox={inbox}
      chapters={rooms.map(({ id, name }) => ({ id, name }))}
      strings={dict.chat}
      language={language}
      notation={resolveLocale(head.get("accept-language"))}
      renderedAt={new Date().toISOString()}
    >
      {children}
    </ChatLayout>
  );
}

export async function MemberChatPane({
  perspective,
}: {
  perspective: MemberPerspective;
}) {
  await requirePerspective(perspective);
  const dict = await getDictionary();

  return <ChatEmptyPane strings={dict.chat.list} />;
}

export async function MemberChatThread({
  perspective,
  params,
}: {
  perspective: MemberPerspective;
  params: Promise<{ conversationId: string }>;
}) {
  const [{ conversationId }, session] = await Promise.all([
    params,
    requirePerspective(perspective),
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
      home={PERSPECTIVE_HOME[perspective]}
      strings={dict.chat}
      language={language}
      notation={resolveLocale(head.get("accept-language"))}
    />
  );
}
