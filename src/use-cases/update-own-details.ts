import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import type { OwnDetailsPatch } from "@/features/profile";

/**
 * `birthDate` and `gender` are deliberately duplicated onto the rider row an
 * account books its own rides with, so an edit on the account has to reach both.
 * A name-only edit stops at the account: the row keeps `firstName`/`lastName`
 * and splitting one string back apart would be lossy.
 */
export async function updateOwnDetails(
  userId: string,
  patch: OwnDetailsPatch,
): Promise<void> {
  await profile.updateOwnDetails(userId, patch);

  const { birthDate, gender } = patch;
  if (birthDate === undefined && gender === undefined) return;

  await passengers.updateOwnRiderDetails(userId, { birthDate, gender });
}
