import { chat } from "@/features/chat";
import type {
  ChatMessageView,
  ConversationSummary,
  MemberView,
} from "@/features/chat";
import { profile } from "@/features/profile";
import { scopeChapters } from "@/lib/access";
import type { ActiveScope, AdminScope } from "@/lib/access";
import { avatarSeed, avatarSvg } from "@/lib/avatar";

const PARTICIPANT_SEPARATOR = " · ";

export type ScopedConversation = Omit<ConversationSummary, "me">;

export type OversightItem = ScopedConversation & {
  display: { name: string };
  participants: { userId: string; name: string }[];
};

export type OversightMember = MemberView & {
  name: string;
  avatarSvg: string | null;
};

export type OversightThread = {
  conversation: ScopedConversation;
  members: OversightMember[];
  messages: ChatMessageView[];
};

export async function listConversationsInScope(
  scope: AdminScope,
  active: ActiveScope,
  opts: { take?: number; before?: string } = {},
): Promise<OversightItem[]> {
  const chapterIds =
    scope.global && active.kind === "all"
      ? ("all" as const)
      : scopeChapters(scope, active).map((chapter) => chapter.id);
  if (chapterIds !== "all" && chapterIds.length === 0) return [];

  const conversations = await chat.listConversationsInScope({
    chapterIds,
    ...opts,
  });

  const directs = conversations.filter(
    (conversation) => conversation.kind === "direct",
  );
  const memberIds = await Promise.all(
    directs.map((conversation) => chat.listMemberUserIds(conversation.id)),
  );
  const byConversation = new Map(
    directs.map((conversation, index) => [conversation.id, memberIds[index]]),
  );

  const profiles = await profile.getProfiles(memberIds.flat());
  const people = new Map(profiles.map((person) => [person.id, person]));

  return conversations.map((conversation) => {
    const participants = (byConversation.get(conversation.id) ?? []).map(
      (userId) => ({ userId, name: people.get(userId)?.name ?? "" }),
    );
    return {
      ...conversation,
      display: {
        name:
          conversation.title ??
          participants
            .map((participant) => participant.name)
            .filter(Boolean)
            .join(PARTICIPANT_SEPARATOR),
      },
      participants,
    };
  });
}

const inScope = (
  scope: AdminScope,
  active: ActiveScope,
  chapterId: string | null,
) =>
  chapterId === null
    ? scope.global
    : scopeChapters(scope, active).some((chapter) => chapter.id === chapterId);

export async function readConversationAsAdmin(
  scope: AdminScope,
  active: ActiveScope,
  conversationId: string,
  opts: { beforeSeq?: number; take?: number } = {},
): Promise<OversightThread | null> {
  const thread = await chat.readConversationAsAdmin(conversationId, opts);
  if (!thread) return null;
  if (!inScope(scope, active, thread.conversation.chapterId)) return null;

  const profiles = await profile.getProfiles(
    thread.members.map((member) => member.userId),
  );
  const people = new Map(profiles.map((person) => [person.id, person]));

  return {
    conversation: thread.conversation,
    members: thread.members.map((member) => {
      const person = people.get(member.userId);
      return {
        ...member,
        name: person?.name ?? "",
        avatarSvg: person ? avatarSvg(avatarSeed(person.email)) : null,
      };
    }),
    messages: thread.messages,
  };
}
