import { accounts } from "@/features/accounts";
import { passengers } from "@/features/passengers";
import { personProfiles } from "@/features/person-profiles";

export async function deleteAccount(userId: string) {
  await passengers.handRidersToTheirOwnAccounts(userId);
  const managed = await passengers.listPassengersManagedBy(userId);
  const photos = await personProfiles.listPhotoFilesOf({
    userIds: [userId],
    passengerIds: managed
      .filter((rider) => !rider.userId)
      .map((rider) => rider.id),
  });

  await passengers.removeOwnPassenger(userId);
  await accounts.deleteUser(userId);
  await personProfiles.purgePhotoFiles(photos);
}
