import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import type { OwnDetailsPatch } from "@/features/profile";
import { splitName } from "@/lib/utils";

/**
 * The account and the rider row the account books its own rides with carry
 * the same person: a first or last name is written into both, and the account
 * name is put back together from them. A rider row's own two fields are the
 * truth to complete from; without one the account name is split.
 */
async function namesAfter(
  userId: string,
  { firstName, lastName }: Pick<OwnDetailsPatch, "firstName" | "lastName">,
) {
  const own = await passengers.getOwnPassenger(userId);
  const current =
    own ?? splitName((await profile.getProfile(userId))?.name ?? "");
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
