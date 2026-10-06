import { chat } from "@/features/chat";
import type { ConversationSummary } from "@/features/chat";
import {
  personProfiles,
  photoUrl,
  subjectSlug,
  type SubjectRef,
} from "@/features/person-profiles";
import { profile } from "@/features/profile";
import type { ProfileSummary } from "@/features/profile";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import { presence } from "@/lib/realtime";
import { visiblePhotoSubjects, type Viewer } from "../person-access";

export type ChatDisplay = {
  name: string;
  avatarSvg: string | null;
  photoUrl?: string | null;
};

export type InboxItem = ConversationSummary & {
  display: ChatDisplay;
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

export async function visiblePhotoUrls(
  viewer: Viewer,
  userIds: string[],
): Promise<Map<string, string>> {
  const refs: SubjectRef[] = [...new Set(userIds)].map((id) => ({
    kind: "user",
    id,
  }));
  const photos = await personProfiles.photoFileIdsOf(refs);
  const withPhoto = refs.filter((ref) => photos.has(subjectSlug(ref)));
  const visible = await visiblePhotoSubjects(
    viewer,
    withPhoto.filter((ref) => ref.id !== viewer.user.id),
  );

  const urls = new Map<string, string>();
  for (const ref of withPhoto) {
    const slug = subjectSlug(ref);
    const url = photoUrl(photos.get(slug) ?? null);
    if (url && (ref.id === viewer.user.id || visible.has(slug)))
      urls.set(ref.id, url);
  }
  return urls;
}

export const displayOf = (
  conversation: ConversationSummary,
  people: Map<string, ProfileSummary>,
  photos: Map<string, string>,
): ChatDisplay => {
  if (conversation.kind === "group")
    return { name: conversation.title ?? "", avatarSvg: null };

  const other = conversation.otherUserId
    ? people.get(conversation.otherUserId)
    : undefined;
  return {
    name: other?.name ?? "",
    avatarSvg: other ? avatarSvg(avatarSeed(other.email)) : null,
    photoUrl: other ? (photos.get(other.id) ?? null) : null,
  };
};

async function decorate(
  viewer: Viewer,
  conversations: ConversationSummary[],
): Promise<InboxItem[]> {
  if (conversations.length === 0) return [];

  const ids = peopleOf(conversations);
  const others = conversations
    .map((conversation) => conversation.otherUserId)
    .filter((id): id is string => id !== null);
  const [profiles, photos, online] = await Promise.all([
    profile.getProfiles(ids),
    visiblePhotoUrls(viewer, others),
    presence.isOnline(others),
  ]);
  const people = new Map(profiles.map((person) => [person.id, person]));

  return conversations.map((conversation) => {
    const sender = conversation.lastMessage?.senderId;
    return {
      ...conversation,
      display: displayOf(conversation, people, photos),
      online:
        conversation.otherUserId !== null &&
        online.has(conversation.otherUserId),
      lastMessageSenderName: sender ? (people.get(sender)?.name ?? null) : null,
    };
  });
}

export const getInbox = async (
  viewer: Viewer,
  opts?: { take?: number; before?: string },
) => decorate(viewer, await chat.listConversations(viewer.user.id, opts));

export const syncInbox = async (viewer: Viewer, since: string) =>
  decorate(viewer, await chat.syncConversations(viewer.user.id, since));
