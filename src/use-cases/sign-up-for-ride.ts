import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { rides } from "@/features/rides";
import { DomainError } from "@/lib/domain-error";
import { assertPilotsReady } from "./pilot-readiness";

async function rideChapter(rideId: string) {
  const ride = await rides.getRideScope(rideId);
  if (!ride) throw new DomainError("unknownRide");
  return ride.chapterId;
}

/**
 * Lifecycle 3B-b: a pilot signs up for an open ride. Only someone holding the
 * pilot role in the ride's own chapter, and only where the chapter lets its
 * pilots sign up themselves. A country admin is not a pilot by virtue of being
 * an admin, so the membership row is asked, not the session's admin reach.
 * The training gate holds here as it does when an admin staffs the ride.
 */
export async function signUpForRide(rideId: string, userId: string) {
  const chapterId = await rideChapter(rideId);
  const [roles, settings] = await Promise.all([
    membership.getMemberRoles(userId, chapterId),
    chapters.getSettings(chapterId),
  ]);
  if (!roles.includes("pilot")) throw new DomainError("notPilot");
  if (!settings.pilotsMaySelfAssign) throw new DomainError("selfSignUpOff");
  await assertPilotsReady([userId], chapterId);
  return rides.selfAssign(rideId, userId);
}

/** Stepping back works until the chapter's staffing window opens. */
export async function withdrawFromRide(rideId: string, userId: string) {
  const settings = await chapters.getSettings(await rideChapter(rideId));
  return rides.withdraw(rideId, userId, settings.staffingCheckLeadHours);
}
