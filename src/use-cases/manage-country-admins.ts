import { activity } from "@/features/activity";
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

  await chapters.appointCountryAdmin(userId, countryId);
  await activity.record({
    userId,
    actorUserId,
    type: "countryAdminAppointed",
  });
  return "ok";
}

export async function removeCountryAdmin({
  userId,
  countryId,
  actorUserId,
}: {
  userId: string;
  countryId: string;
  actorUserId: string;
}) {
  await chapters.removeCountryAdmin(userId, countryId);
  await activity.record({
    userId,
    actorUserId,
    type: "countryAdminRemoved",
  });
}
