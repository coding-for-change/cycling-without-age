import { accounts } from "@/features/accounts";
import { passengers } from "@/features/passengers";
import { personProfiles } from "@/features/person-profiles";
import { rideRequests } from "@/features/ride-requests";
import { rides } from "@/features/rides";
import { DomainError } from "@/lib/domain-error";

/**
 * Riders with an account of their own become their own manager first. The
 * riders without one are only deleted when whoever deletes the account said
 * so (`removeRiders`), having seen them by name: the schema refuses to delete
 * an account that still manages riders, so the cascade is never silent. An
 * admin can hand a rider over to someone else before, and they then stay.
 */
export async function deleteAccount(
  userId: string,
  actorUserId = userId,
  { removeRiders = false }: { removeRiders?: boolean } = {},
) {
  const [managed, own] = await Promise.all([
    passengers.listPassengersManagedBy(userId),
    passengers.getOwnPassenger(userId),
  ]);
  const goneWith = managed
    .filter((rider) => !rider.userId)
    .map((rider) => rider.id);
  if (goneWith.length && !removeRiders) throw new DomainError("managesRiders");
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
  if (goneWith.length) await passengers.removeRidersWithoutAccount(userId);
  await passengers.removeOwnPassenger(userId);
  await accounts.deleteUser(userId);
  await personProfiles.purgePhotoFiles(photos);
}
