import * as Sentry from "@sentry/nextjs";
import { rideRequests, type RideRequestInput } from "@/features/ride-requests";
import { serializeError } from "@/lib/observability/errors";
import { logger } from "@/lib/observability/logger";
import { submitRideRequest } from "./submit-ride-request";

/**
 * The changed request is sent before the old one is withdrawn, so the riders
 * are never left without one. If the withdrawal fails both stay open and the
 * owner is told to cancel the old one.
 */
export async function changeRideRequest(
  fromRequestId: string,
  input: RideRequestInput,
  userId: string,
  now = new Date(),
) {
  const old = await rideRequests.getChangeable(fromRequestId, userId, now);
  const request = await submitRideRequest(input, userId, now, {
    replacesRequestIds: [old.id],
  });
  const oldRequestKept = await rideRequests.withdraw(old.id, userId, now).then(
    () => false,
    (error) => {
      Sentry.captureException(error);
      logger.error(
        {
          err: serializeError(error),
          request_id: request.id,
          replaced_request_id: old.id,
        },
        "changing a ride request left the old one open",
      );
      return true;
    },
  );
  return { ...request, oldRequestKept };
}
