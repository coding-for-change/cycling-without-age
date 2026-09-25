import { fleet } from "@/features/fleet";
import { rides, type RideInput } from "@/features/rides";

export async function scheduleRide(input: RideInput) {
  await fleet.assertUsable(input.trishawIds ?? [], input.chapterId);
  return rides.scheduleRide(input);
}

export async function rescheduleRide(id: string, input: RideInput) {
  await fleet.assertUsable(input.trishawIds ?? [], input.chapterId);
  return rides.rescheduleRide(id, input);
}

/**
 * Keeping a trishaw that was grounded after it was allocated is allowed — the
 * ride shows the warning — but allocating one that is grounded now is not.
 */
export async function allocateTrishaws(rideId: string, trishawIds: string[]) {
  const ride = await rides.getRide(rideId);
  if (!ride) return rides.setRideTrishaws(rideId, trishawIds);
  const kept = new Set(ride.trishaws.map(({ trishaw }) => trishaw.id));
  await fleet.assertUsable(
    trishawIds.filter((id) => !kept.has(id)),
    ride.chapterId,
  );
  return rides.setRideTrishaws(rideId, trishawIds);
}

export async function allocationChoices(rideId: string) {
  const ride = await rides.getRide(rideId);
  if (!ride) return null;
  const trishaws = await fleet.listTrishaws([ride.chapterId]);
  const sharing = [...new Set(trishaws.flatMap(fleet.chapterIdsReaching))];
  const overlapping = (
    await rides.listRidesInRange(sharing, ride.startsAt, ride.endsAt)
  ).filter((other) => other.id !== ride.id && other.status !== "cancelled");
  const booked = new Set(
    overlapping.flatMap((other) => other.trishaws.map((t) => t.trishaw.id)),
  );
  return {
    ride,
    trishaws,
    busy: Object.fromEntries(trishaws.map((t) => [t.id, booked.has(t.id)])),
  };
}
