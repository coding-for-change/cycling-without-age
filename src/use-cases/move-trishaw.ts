import { fleet } from "@/features/fleet";
import { rides } from "@/features/rides";

export async function moveTrishaw(
  trishawId: string,
  storageLocationId: string,
  actorUserId: string,
) {
  const losing = await fleet.chaptersLosingAccess(trishawId, storageLocationId);
  const counts = await Promise.all(
    losing.map((chapterId) =>
      rides.countFutureRidesUsing(chapterId, [trishawId]),
    ),
  );
  return fleet.moveTrishaw({
    id: trishawId,
    storageLocationId,
    actorUserId,
    futureRideCount: counts.reduce((sum, count) => sum + count, 0),
  });
}
