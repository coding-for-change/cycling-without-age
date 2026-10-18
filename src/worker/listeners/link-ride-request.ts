import { rideRequests } from "@/features/ride-requests";
import { domainCode } from "@/lib/domain-error";
import type { Envelope } from "@/lib/events/catalog";

/**
 * A ride scheduled from a Ride Request links it, should the scheduling use
 * case have stopped between writing the ride and linking it. A request that
 * is linked already, or was handed back, has nothing left to do here.
 */
export async function linkRideRequestListener({ event }: Envelope) {
  if (event.type !== "ride.scheduled" || !event.requestId) return;
  try {
    await rideRequests.markScheduled(
      event.requestId,
      { id: event.rideId, returnLegId: event.returnLegId },
      event.actorUserId,
    );
  } catch (error) {
    if (domainCode(error) === null) throw error;
  }
}
