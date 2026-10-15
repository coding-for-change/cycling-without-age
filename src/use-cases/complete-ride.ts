import { chat } from "@/features/chat";
import { rides, type Executor } from "@/features/rides";
import { serializeError } from "@/lib/observability/errors";
import { logger } from "@/lib/observability/logger";

/**
 * Lifecycle 6D: closing the roster is the statistics moment, and the ride's
 * chat wraps up with it — frozen, until someone in it keeps chatting. The
 * roster closes in its own transaction first, so a chat that fails to freeze
 * is logged and never takes the closed roster back.
 */
export async function completeRide(
  rideId: string,
  actorUserId: string,
  as: Executor,
  now = new Date(),
) {
  const tally = await rides.closeRoster(rideId, actorUserId, as, now);
  try {
    await chat.freezeRideConversation(rideId);
  } catch (error) {
    logger.error(
      { err: serializeError(error), ride_id: rideId },
      "ride chat freeze failed",
    );
  }
  return tally;
}
