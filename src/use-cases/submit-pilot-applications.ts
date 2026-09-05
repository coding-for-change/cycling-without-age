import { activity } from "@/features/activity";
import { membership } from "@/features/membership";

export async function submitPilotApplications({
  userId,
  chapterIds,
}: {
  userId: string;
  chapterIds: string[];
}) {
  for (const chapterId of chapterIds) {
    await membership.applyAsPilot({ userId, chapterId });
    await activity.record({
      userId,
      actorUserId: userId,
      chapterId,
      type: "applicationSubmitted",
    });
  }
}
