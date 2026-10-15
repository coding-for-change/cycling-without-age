import { accounts } from "@/features/accounts";
import { passengers } from "@/features/passengers";
import { personProfiles } from "@/features/person-profiles";
import { rides } from "@/features/rides";

export async function deleteAccount(userId: string, actorUserId = userId) {
  await passengers.handRidersToTheirOwnAccounts(userId);
  const [managed, own] = await Promise.all([
    passengers.listPassengersManagedBy(userId),
    passengers.getOwnPassenger(userId),
  ]);
  const goneWith = managed
    .filter((rider) => !rider.userId)
    .map((rider) => rider.id);
  const photos = await personProfiles.listPhotoFilesOf({
    userIds: [userId],
    passengerIds: goneWith,
  });

  await rides.cancelUpcomingBookings(
    [...goneWith, ...(own ? [own.id] : [])],
    actorUserId,
  );
  await passengers.removeOwnPassenger(userId);
  await accounts.deleteUser(userId);
  await personProfiles.purgePhotoFiles(photos);
}
