import { training } from "@/features/training";
import { activity } from "@/lib/activity";
import type { Envelope } from "@/lib/events/catalog";

export async function recordCoursePassed({
  event,
}: Envelope<"training.coursePassed">) {
  const course = await training.getCourse(event.courseId);
  await activity.record({
    userId: event.userId,
    actorUserId: event.actorUserId,
    ...(event.chapterId ? { chapterId: event.chapterId } : {}),
    type: "trainingPassed",
    payload: { name: course?.title ?? "" },
  });
}

async function exemptionPayload(familyId: string | null) {
  if (!familyId) return { scope: "all", name: "" };
  const titles = await training.familyTitles([familyId]);
  return { scope: "course", name: titles.get(familyId) ?? "" };
}

export async function recordExemptionGranted({
  event,
}: Envelope<"training.exemptionGranted">) {
  await activity.record({
    userId: event.userId,
    ...(event.actorUserId ? { actorUserId: event.actorUserId } : {}),
    ...(event.chapterId ? { chapterId: event.chapterId } : {}),
    type: "trainingExemptionGranted",
    payload: {
      ...(await exemptionPayload(event.familyId)),
      reason: event.reason,
    },
  });
}

export async function recordExemptionRevoked({
  event,
}: Envelope<"training.exemptionRevoked">) {
  await activity.record({
    userId: event.userId,
    actorUserId: event.actorUserId,
    ...(event.chapterId ? { chapterId: event.chapterId } : {}),
    type: "trainingExemptionRevoked",
    payload: await exemptionPayload(event.familyId),
  });
}
