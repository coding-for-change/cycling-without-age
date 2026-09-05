import { accounts } from "@/features/accounts";
import { activity } from "@/features/activity";

export async function claimAccount(userId: string) {
  // ponytail: read-then-write, so a double submit could record the event twice;
  // a `updateMany({ where: { claimedAt: null } })` in the service closes it.
  if (!(await accounts.getClaimBanner(userId))) return;

  await accounts.markClaimed(userId);
  await activity.record({
    userId,
    actorUserId: userId,
    type: "accountClaimed",
  });
}
