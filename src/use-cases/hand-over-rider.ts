import { accounts } from "@/features/accounts";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import { rideRequests } from "@/features/ride-requests";
import { DomainError } from "@/lib/domain-error";

export type HandOverTarget =
  | { kind: "member"; userId: string }
  | { kind: "invite"; name: string; contact: string };

async function requireMemberOf(userId: string, chapterId: string) {
  const roles = await membership.getMemberRoles(userId, chapterId);
  if (!roles.length) throw new DomainError("notChapterMember");
  return userId;
}

/**
 * An admin moves a rider to another account: a member of the rider's chapter,
 * or someone new who gets an account and an invitation. A contact that
 * already has an account must belong to the chapter first, so nobody is put
 * in charge of a stranger's rider by typing an address. The rider keeps
 * their bookings, profile, history and open requests; only who books for
 * them changes.
 */
export async function handOverRider({
  passengerId,
  target,
  actorUserId,
}: {
  passengerId: string;
  target: HandOverTarget;
  actorUserId: string;
}) {
  const rider = await passengers.getPassenger(passengerId);
  if (!rider || rider.userId) throw new DomainError("unknownPassenger");

  let toUserId: string;
  let invited = false;
  if (target.kind === "member") {
    toUserId = await requireMemberOf(target.userId, rider.chapterId);
  } else {
    const existing = await accounts.findUserIdByContact(target.contact);
    if (existing) toUserId = await requireMemberOf(existing, rider.chapterId);
    else {
      const { userId } = await accounts.provisionUserStrict({
        name: target.name,
        contact: target.contact,
        createdByUserId: actorUserId,
        managesOthers: true,
      });
      await membership.joinAsPassenger(userId, rider.chapterId, actorUserId);
      toUserId = userId;
      invited = true;
    }
  }

  const moved = await passengers.handOverRider(
    passengerId,
    toUserId,
    actorUserId,
    { invited },
  );
  await rideRequests.handOverOpenRequests(
    passengerId,
    moved.fromUserId,
    toUserId,
  );
  await profile.markManagesOthers(toUserId);
  if (invited)
    await passengers.announceCareInvite({
      chapterId: rider.chapterId,
      userId: toUserId,
      actorUserId,
      passengerId,
    });
  return { ...moved, toUserId, invited };
}

/**
 * The worker's second go at moving a handed-over rider's open requests,
 * should the hand-over have stopped before it did. It moves them only while
 * the rider is still with the account they were handed to, so a hand-over
 * undone in the meantime keeps its requests where they are now.
 */
export async function moveHandedOverRequests({
  passengerId,
  fromUserId,
  toUserId,
}: {
  passengerId: string;
  fromUserId: string;
  toUserId: string;
}) {
  const rider = await passengers.getPassenger(passengerId);
  if (rider?.managedByUserId !== toUserId) return 0;
  return rideRequests.handOverOpenRequests(passengerId, fromUserId, toUserId);
}
