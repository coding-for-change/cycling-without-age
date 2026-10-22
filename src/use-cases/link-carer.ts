import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { DomainError } from "@/lib/domain-error";

export async function requestCarerLink({
  passengerId,
  caretakerUserId,
  actorUserId,
}: {
  passengerId: string;
  caretakerUserId: string;
  actorUserId: string;
}) {
  const rider = await passengers.getPassenger(passengerId);
  if (!rider?.userId) throw new DomainError("unknownPassenger");

  const roles = await membership.getMemberRoles(
    caretakerUserId,
    rider.chapterId,
  );
  if (!roles.length) throw new DomainError("notChapterMember");

  const request = await passengers.requestCareLink({
    passengerId,
    caretakerUserId,
    requestedByUserId: actorUserId,
  });
  return { ...request, riderUserId: rider.userId };
}
