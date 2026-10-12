import { accounts } from "@/features/accounts";
import type { AssistedPassengerInput } from "@/features/accounts";
import { activity } from "@/lib/activity";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { rideLocations } from "@/features/ride-locations";

export async function provisionAssistedPassenger({
  adminUserId,
  input,
}: {
  adminUserId: string;
  input: AssistedPassengerInput;
}) {
  const {
    chapterId,
    firstName,
    lastName,
    birthDate,
    gender,
    contact,
    helper,
    needs,
  } = input;
  const owner = helper && helper.contact === contact ? helper : null;
  if (needs?.rideLocationId)
    await rideLocations.requireUsableRideLocation(
      needs.rideLocationId,
      chapterId,
    );

  const { userId } = await accounts.provisionUserStrict({
    name: owner ? owner.name : `${firstName} ${lastName}`,
    contact,
    createdByUserId: adminUserId,
    ...(helper ? { helper } : {}),
    ...(owner ? { managesOthers: true } : {}),
  });

  await membership.joinAsPassenger(userId, chapterId, adminUserId);
  const passenger = await passengers.addPassenger({
    chapterId,
    managedByUserId: userId,
    userId: owner ? null : userId,
    firstName,
    lastName,
    birthDate,
    gender,
  });
  if (needs) await passengers.setRiderNeeds(passenger.id, needs);

  await activity.record({
    userId,
    actorUserId: adminUserId,
    chapterId,
    type: "accountCreated",
  });

  return { userId };
}
