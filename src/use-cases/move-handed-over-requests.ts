import { passengers } from "@/features/passengers";
import { rideRequests } from "@/features/ride-requests";

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
