import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import type { ManagedRiderInput } from "@/features/passengers";
import { profile } from "@/features/profile";
import { DomainError } from "@/lib/domain-error";

export async function addManagedRider({
  userId,
  rider,
}: {
  userId: string;
  rider: ManagedRiderInput;
}) {
  const [managed, joined] = await Promise.all([
    passengers.listPassengersManagedBy(userId),
    membership.listMembershipsOfUser(userId),
  ]);
  const chapterId =
    managed[0]?.chapterId ??
    joined.find((m) => m.roles.includes("passenger"))?.chapterId;

  const isPassengerThere = joined.some(
    (m) => m.chapterId === chapterId && m.roles.includes("passenger"),
  );
  if (!chapterId || !isPassengerThere) {
    throw new DomainError("notChapterMember");
  }

  await passengers.addManagedPassengers(userId, chapterId, [rider]);
  await profile.markManagesOthers(userId);
}
