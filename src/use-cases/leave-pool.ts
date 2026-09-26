import { fleet } from "@/features/fleet";
import { rides } from "@/features/rides";

export async function leavePool(poolId: string, chapterId: string) {
  const trishawIds = await fleet.trishawIdsAt(poolId);
  const futureRideCount = await rides.countFutureRidesUsing(
    chapterId,
    trishawIds,
  );
  return fleet.leavePool({ poolId, chapterId, futureRideCount });
}
