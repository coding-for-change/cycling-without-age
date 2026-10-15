import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";

export async function acceptCareRequest({
  userId,
  requestId,
}: {
  userId: string;
  requestId: string;
}) {
  const { chapterId, relationship } = await passengers.acceptCareRequest(
    requestId,
    userId,
  );

  const joined = await membership.listMembershipsOfUser(userId);
  const isPassengerThere = joined.some(
    (m) => m.chapterId === chapterId && m.roles.includes("passenger"),
  );
  if (!isPassengerThere) await membership.joinAsPassenger(userId, chapterId);
  await profile.markManagesOthers(userId);
  await profile.suggestHelperRelationship(userId, relationship);
  return { chapterId };
}

export const declineCareRequest = ({
  userId,
  requestId,
}: {
  userId: string;
  requestId: string;
}) => passengers.declineCareRequest(requestId, userId);
