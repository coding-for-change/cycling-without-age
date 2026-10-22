import { rideRequests } from "@/features/ride-requests";

/**
 * The requests an account is still waiting on, and the ones the chapter
 * turned down lately. A scheduled request is a ride by now and shows as one.
 */
export async function loadRideRequests(userId: string, now = new Date()) {
  return (await rideRequests.listOfUser(userId, now)).filter(
    (request) =>
      (request.status === "pending" || request.status === "declined") &&
      request.requestedEndsAt > now,
  );
}
