import { chat } from "@/features/chat";
import type {
  ChatMessageView,
  ConversationSummary,
  MemberView,
} from "@/features/chat";
import { profile } from "@/features/profile";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import { presence } from "@/lib/realtime";
import { displayOf } from "./chat-inbox";

const MEMBER_DISPLAY_LIMIT = 200;

export type ConversationMemberView = MemberView & {
  name: string;
  avatarSvg: string | null;
  online: boolean;
};

export type ConversationView = {
  conversation: ConversationSummary;
  display: { name: string; avatarSvg: string | null };
  members: ConversationMemberView[];
  messages: ChatMessageView[];
  viewerId: string;
};

export async function getConversationView(
  conversationId: string,
  userId: string,
): Promise<ConversationView | null> {
  const conversation = await chat.getConversation(conversationId, userId);
  if (!conversation) return null;

  const [members, messages] = await Promise.all([
    chat.listMembers(conversationId),
    chat.listMessages(conversationId, userId),
  ]);

  const shown = members.slice(0, MEMBER_DISPLAY_LIMIT);
  const ids = shown.map((member) => member.userId);
  const [profiles, online] = await Promise.all([
    profile.getProfiles(ids),
    presence.isOnline(ids),
  ]);
  const people = new Map(profiles.map((person) => [person.id, person]));

  return {
    conversation,
    display: displayOf(conversation, people),
    members: shown.map((member) => {
      const person = people.get(member.userId);
      return {
        ...member,
        name: person?.name ?? "",
        avatarSvg: person ? avatarSvg(avatarSeed(person.email)) : null,
        online: online.has(member.userId),
      };
    }),
    messages,
    viewerId: userId,
  };
}
