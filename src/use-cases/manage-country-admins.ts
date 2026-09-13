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
}): Promise<"ok" | "noAccount"> {
  const userId = await profile.getUserIdByEmail(email);
  if (!userId) return "noAccount";

  await chapters.appointCountryAdmin(userId, countryId, actorUserId);
  return "ok";
}
