import { passengers } from "@/features/passengers";
import { rides } from "@/features/rides";
import { DomainError } from "@/lib/domain-error";

/**
 * Lifecycle 5B-b answers come from the rider's side: the account behind the
 * rider — whoever books for them, or the rider themself. Which riders those
 * are is the passengers' rule; the seat is changed under the ride's lock.
 */
async function requireOwnRider(passengerId: string, userId: string) {
  const riders = await passengers.listRidersOfAccount(userId);
  if (!riders.some((rider) => rider.id === passengerId))
    throw new DomainError("unknownPassenger");
}

export async function confirmOwnSeat(
  rideId: string,
  passengerId: string,
  userId: string,
) {
  await requireOwnRider(passengerId, userId);
  return rides.confirmSeat(rideId, passengerId, userId);
}

export async function cancelOwnSeat(
  rideId: string,
  passengerId: string,
  userId: string,
) {
  await requireOwnRider(passengerId, userId);
  return rides.cancelSeat(rideId, passengerId, userId);
}
