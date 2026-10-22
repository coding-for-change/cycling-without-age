import { profile } from "@/features/profile";
import { avatarSeed, avatarSvg } from "@/lib/avatar";

export async function pilotAvatars(
  rides: { assignments: { role: string; user: { id: string } }[] }[],
): Promise<Record<string, string>> {
  const ids = [
    ...new Set(
      rides.flatMap((ride) =>
        ride.assignments
          .filter((assignment) => assignment.role === "pilot")
          .map((assignment) => assignment.user.id),
      ),
    ),
  ];
  const accounts = await profile.getProfiles(ids);
  return Object.fromEntries(
    accounts.map((account) => [
      account.id,
      avatarSvg(avatarSeed(account.email)),
    ]),
  );
}
