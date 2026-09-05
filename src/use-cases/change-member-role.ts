import { activity } from "@/features/activity";
import { membership } from "@/features/membership";
import type { ActivityType } from "@/features/activity";

export type MemberRoleChange = "promote" | "demote" | "remove";

export const SELF_CHANGE = "Cannot change your own role";

const EVENT: Record<MemberRoleChange, ActivityType> = {
  promote: "roleGranted",
  demote: "roleRevoked",
  remove: "memberRemoved",
};

export async function changeMemberRole({
  userId,
  chapterId,
  actorUserId,
  change,
}: {
  userId: string;
  chapterId: string;
  actorUserId: string;
  change: MemberRoleChange;
}) {
  if (userId === actorUserId && change !== "promote")
    throw new Error(SELF_CHANGE);
  if (change === "promote") {
    await membership.promoteToChapterAdmin(userId, chapterId);
  } else if (change === "demote") {
    await membership.revokeChapterRole(userId, chapterId, "admin");
  } else {
    await membership.removeFromChapter(userId, chapterId);
  }

  await activity.record({
    userId,
    actorUserId,
    chapterId,
    type: EVENT[change],
  });
}
