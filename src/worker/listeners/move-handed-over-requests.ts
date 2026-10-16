import { rideRequests } from "@/features/ride-requests";
import type { Envelope } from "@/lib/events/catalog";

/**
 * A handed-over rider's open requests go with them, should the hand-over have
 * stopped between moving the rider and moving the requests. Requests already
 * moved are no longer the old manager's, so a second run finds nothing.
 */
export async function moveHandedOverRequestsListener({ event }: Envelope) {
  if (event.type !== "rider.handedOver") return;
  await rideRequests.handOverOpenRequests(
    event.passengerId,
    event.fromUserId,
    event.toUserId,
  );
}
