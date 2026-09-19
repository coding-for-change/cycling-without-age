import { chat } from "@/features/chat";
import type { ConversationSummary } from "@/features/chat";
import { profile } from "@/features/profile";
import type { ProfileSummary } from "@/features/profile";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import { presence } from "@/lib/realtime";

export type InboxItem = ConversationSummary & {
  display: { name: string; avatarSvg: string | null };
  online: boolean;
  lastMessageSenderName: string | null;
};

const peopleOf = (conversations: ConversationSummary[]) => {
  const ids = new Set<string>();
  for (const conversation of conversations) {
    if (conversation.otherUserId) ids.add(conversation.otherUserId);
    const sender = conversation.lastMessage?.senderId;
    if (sender) ids.add(sender);
  }
  return [...ids];
};

export const displayOf = (
  conversation: ConversationSummary,
  people: Map<string, ProfileSummary>,
) => {
  if (conversation.kind === "group")
    return { name: conversation.title ?? "", avatarSvg: null };

  const other = conversation.otherUserId
    ? people.get(conversation.otherUserId)
    : undefined;
  return {
    name: other?.name ?? "",
    avatarSvg: other ? avatarSvg(avatarSeed(other.email)) : null,
  };
};

async function decorate(
  conversations: ConversationSummary[],
): Promise<InboxItem[]> {
  if (conversations.length === 0) return [];

  const ids = peopleOf(conversations);
  const [profiles, online] = await Promise.all([
    profile.getProfiles(ids),
    presence.isOnline(
      conversations
        .map((conversation) => conversation.otherUserId)
        .filter((id): id is string => id !== null),
    ),
  ]);
  const people = new Map(profiles.map((person) => [person.id, person]));

  return conversations.map((conversation) => {
    const sender = conversation.lastMessage?.senderId;
    return {
      ...conversation,
      display: displayOf(conversation, people),
      online:
        conversation.otherUserId !== null &&
        online.has(conversation.otherUserId),
      lastMessageSenderName: sender ? (people.get(sender)?.name ?? null) : null,
    };
  });
}

export const getInbox = async (
  userId: string,
  opts?: { take?: number; before?: string },
) => decorate(await chat.listConversations(userId, opts));

export const syncInbox = async (userId: string, since: string) =>
  decorate(await chat.syncConversations(userId, since));
