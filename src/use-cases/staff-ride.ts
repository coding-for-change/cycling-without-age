import { membership } from "@/features/membership";
import { rides } from "@/features/rides";
import { DomainError } from "@/lib/domain-error";

/**
 * TEMPORARY: Pilots assigning themself comes in PR5.
 * An admin puts a pilot on a ride. Only someone who holds the pilot role in the
 * ride's own chapter can be put there — an admin of the chapter is not a pilot
 * by virtue of being its admin.
 */
export async function staffRide(
  ride: { id: string; chapterId: string },
  userId: string,
  actorUserId: string,
) {
  const roles = await membership.getMemberRoles(userId, ride.chapterId);
  if (!roles.includes("pilot")) throw new DomainError("notPilot");
  return rides.assignVolunteer(ride.id, userId, actorUserId);
}
