import { chapters } from "@/features/chapters";
import { chat } from "@/features/chat";
import { membership } from "@/features/membership";
import { isChapterAdmin } from "@/lib/access";
import type { Access } from "@/lib/access";
import { DomainError } from "@/lib/domain-error";

export type CreateGroupChatInput = {
  viewerUserId: string;
  viewerAccess: Access;
  title: string;
  chapterId: string;
  memberUserIds: string[];
};

export async function createGroupChat({
  viewerUserId,
  viewerAccess,
  title,
  chapterId,
  memberUserIds,
}: CreateGroupChatInput): Promise<{ conversationId: string }> {
  const countryId = await chapters.getChapterCountryId(chapterId);
  if (countryId === null) throw new DomainError("unknownChapter");

  const inChapter = new Set(
    (await membership.listMembersOfChapters([chapterId])).map((m) => m.userId),
  );

  if (
    !inChapter.has(viewerUserId) &&
    !isChapterAdmin(viewerAccess, chapterId, countryId)
  )
    throw new DomainError("notMember");

  if (memberUserIds.some((userId) => !inChapter.has(userId)))
    throw new DomainError("notReachable");

  const conversation = await chat.createGroup({
    title,
    chapterId,
    createdByUserId: viewerUserId,
    memberUserIds,
  });
  return { conversationId: conversation.id };
}
