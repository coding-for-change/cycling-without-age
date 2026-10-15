import { chapters } from "@/features/chapters";
import { profile } from "@/features/profile";

export async function appointCountryAdminByEmail({
  email,
  countryId,
  actorUserId,
}: {
  email: string;
  countryId: string;
  actorUserId: string;
}): Promise<{ userId: string } | null> {
  const userId = await profile.getUserIdByEmail(email);
  if (!userId) return null;

  await chapters.appointCountryAdmin(userId, countryId, actorUserId);
  return { userId };
}
