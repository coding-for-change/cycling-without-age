import { accounts } from "@/features/accounts";
import type { AssistedPassengerInput } from "@/features/accounts";
import { activity } from "@/lib/activity";
import { DomainError } from "@/lib/domain-error";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";

const riderOf = ({
  firstName,
  lastName,
  birthDate,
  gender,
}: AssistedPassengerInput) => ({ firstName, lastName, birthDate, gender });

export async function provisionAssistedPassenger({
  adminUserId,
  input,
}: {
  adminUserId: string;
  input: AssistedPassengerInput;
}) {
  const { chapterId, firstName, lastName, helper, pickup } = input;
  const owner = helper ?? null;
  const contact = owner ? owner.contact : input.contact;
  if (!contact) throw new DomainError("notFound");

  if (owner) {
    const existing = await accounts.findUserIdByContact(contact);
    if (existing) {
      await passengers.requestCare({
        chapterId,
        caretakerUserId: existing,
        requestedByUserId: adminUserId,
        rider: { ...riderOf(input), ...(pickup ? { pickup } : {}) },
        relationship: owner.relationship,
        helperName: owner.name,
      });
      return { userId: existing, outcome: "sent" as const };
    }
  }

  const { userId } = await accounts.provisionUserStrict({
    name: owner ? owner.name : `${firstName} ${lastName}`,
    contact,
    createdByUserId: adminUserId,
    ...(owner ? { helper: owner, managesOthers: true } : {}),
  });

  await membership.joinAsPassenger(userId, chapterId, adminUserId);
  const passenger = await passengers.addPassenger({
    chapterId,
    managedByUserId: userId,
    userId: owner ? null : userId,
    ...riderOf(input),
    ...(owner && pickup ? { pickup } : {}),
  });
  if (!owner && pickup) {
    await (pickup.residence === "home"
      ? profile.setResidence(userId, "home", pickup)
      : profile.setResidence(userId, "careHome"));
  }

  await activity.record({
    userId,
    actorUserId: adminUserId,
    chapterId,
    type: "accountCreated",
  });

  if (owner) {
    await passengers.announceCareInvite({
      chapterId,
      userId,
      actorUserId: adminUserId,
      passengerId: passenger.id,
    });
  }

  return {
    userId,
    outcome: owner ? ("sent" as const) : ("created" as const),
  };
}
