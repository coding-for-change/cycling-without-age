import { membership } from "@/features/membership";
import { profile } from "@/features/profile";
import type { HomeInput, Residence } from "@/features/profile";

export async function settlePassengerLocation({
  userId,
  chapterId,
  residence,
  home,
}: {
  userId: string;
  chapterId: string;
  residence: Residence;
  home?: HomeInput;
}) {
  await profile.setResidence(userId, residence, home);
  await membership.joinAsPassenger(userId, chapterId);
}

export async function settleCaretakerLocation({
  userId,
  chapterId,
}: {
  userId: string;
  chapterId: string;
}) {
  await profile.markManagesOthers(userId);
  await membership.joinAsPassenger(userId, chapterId);
}
