import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import type { OwnDetailsPatch } from "@/features/profile";

export async function updateOwnDetails(
  userId: string,
  patch: OwnDetailsPatch,
): Promise<void> {
  await profile.updateOwnDetails(userId, patch);

  const { birthDate, gender } = patch;
  if (birthDate === undefined && gender === undefined) return;

  await passengers.updateOwnRiderDetails(userId, { birthDate, gender });
}
