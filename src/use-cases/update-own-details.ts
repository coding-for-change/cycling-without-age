import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import type { OwnDetailsPatch } from "@/features/profile";
import { nameParts } from "@/lib/utils";

/**
 * The account and the rider row the account books its own rides with carry
 * the same person: a first or last name is written into both, and the account
 * name is put back together from them (`nameParts` says which side to
 * complete from).
 */
async function namesAfter(
  userId: string,
  { firstName, lastName }: Pick<OwnDetailsPatch, "firstName" | "lastName">,
) {
  const [own, account] = await Promise.all([
    passengers.getOwnPassenger(userId),
    profile.getProfile(userId),
  ]);
  const current = nameParts(account?.name ?? "", own);
  const next = {
    firstName: firstName ?? current.firstName,
    lastName: lastName ?? current.lastName,
  };
  return {
    name: `${next.firstName} ${next.lastName}`.trim(),
    rider: own ? next : null,
  };
}

export async function updateOwnDetails(
  userId: string,
  patch: OwnDetailsPatch,
): Promise<void> {
  const { firstName, lastName, ...rest } = patch;
  const names =
    firstName === undefined && lastName === undefined
      ? null
      : await namesAfter(userId, { firstName, lastName });

  await profile.updateOwnDetails(
    userId,
    names ? { ...rest, name: names.name } : rest,
  );

  const { birthDate, gender } = patch;
  const rider = {
    ...(names?.rider ?? {}),
    ...(birthDate === undefined ? {} : { birthDate }),
    ...(gender === undefined ? {} : { gender }),
  };
  if (Object.keys(rider).length === 0) return;

  await passengers.updateOwnRiderDetails(userId, rider);
}
