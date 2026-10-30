import { accounts } from "@/features/accounts";
import { passengers } from "@/features/passengers";
import { personProfiles } from "@/features/person-profiles";
import { rideRequests } from "@/features/ride-requests";
import { rides } from "@/features/rides";
import { DomainError } from "@/lib/domain-error";
import { serializeError } from "@/lib/observability/errors";
import { logger } from "@/lib/observability/logger";

/**
 * Riders with an account of their own become their own manager first. The
 * riders without one are only deleted when whoever deletes the account named
 * exactly them (`removeRiders`), having been shown them: the schema refuses
 * to delete an account that still manages riders, so the cascade is never
 * silent, and a rider who arrived after the dialog opened is not swept along.
 * An admin can hand a rider over to someone else before, and they then stay.
 *
 * Signing in with Apple is revoked at Apple too. When Apple cannot be reached
 * the deletion still goes ahead: nobody is kept from leaving over it.
 */
export async function deleteAccount(
  userId: string,
  actorUserId = userId,
  { removeRiders = [] }: { removeRiders?: string[] } = {},
) {
  const [managed, own] = await Promise.all([
    passengers.listPassengersManagedBy(userId),
    passengers.getOwnPassenger(userId),
  ]);
  const goneWith = managed
    .filter((rider) => !rider.userId)
    .map((rider) => rider.id);
  const confirmed = new Set(removeRiders);
  if (
    goneWith.length !== confirmed.size ||
    goneWith.some((id) => !confirmed.has(id))
  )
    throw new DomainError("managesRiders");
  await passengers.handRidersToTheirOwnAccounts(userId);
  const photos = await personProfiles.listPhotoFilesOf({
    userIds: [userId],
    passengerIds: goneWith,
  });

  const leaving = [...goneWith, ...(own ? [own.id] : [])];
  await rides.cancelUpcomingBookings(leaving, actorUserId);
  await rideRequests.withdrawOpenRequests(
    { requesterUserId: userId, passengerIds: leaving },
    actorUserId,
  );
  if (goneWith.length)
    await passengers.removeRidersWithoutAccount(userId, goneWith);
  await passengers.removeOwnPassenger(userId);
  await accounts
    .revokeAppleSignIn(userId)
    .catch((error) =>
      logger.warn(
        { err: serializeError(error), user_id: userId },
        "apple sign-in not revoked",
      ),
    );
  await accounts.deleteUser(userId);
  await personProfiles.purgePhotoFiles(photos);
}
