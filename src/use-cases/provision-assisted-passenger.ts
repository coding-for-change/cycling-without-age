import { accounts } from "@/features/accounts";
import type { AssistedPassengerInput } from "@/features/accounts";
import { activity } from "@/lib/activity";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";

export async function provisionAssistedPassenger({
  adminUserId,
  input,
}: {
  adminUserId: string;
  input: AssistedPassengerInput;
}) {
  const { chapterId, firstName, lastName, birthDate, gender, contact, helper } =
    input;
  const owner = helper && helper.contact === contact ? helper : null;

  const { userId } = await accounts.provisionUserStrict({
    name: owner ? owner.name : `${firstName} ${lastName}`,
    contact,
    createdByUserId: adminUserId,
    ...(helper ? { helper } : {}),
    ...(owner ? { managesOthers: true } : {}),
  });

  await membership.joinAsPassenger(userId, chapterId);
  await passengers.addPassenger({
    chapterId,
    managedByUserId: userId,
    userId: owner ? null : userId,
    firstName,
    lastName,
    birthDate,
    gender,
  });

  await activity.record({
    userId,
    actorUserId: adminUserId,
    chapterId,
    type: "accountCreated",
  });

  return { userId };
}
