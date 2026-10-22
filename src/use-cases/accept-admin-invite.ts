import { admins } from "@/features/admins";
import { chapters } from "@/features/chapters";
import { profile } from "@/features/profile";
import { DomainError } from "@/lib/domain-error";

export async function acceptAdminInvite({
  inviteId,
  userId,
}: {
  inviteId: string;
  userId: string;
}) {
  const invite = await admins.getInvite(inviteId);
  if (!invite || invite.userId !== userId) throw new DomainError("notFound");

  const status = admins.inviteStatusOf(invite);
  if (status === "accepted")
    return { kind: invite.kind, countryId: invite.countryId };
  if (status === "revoked") throw new DomainError("inviteClosed");
  if (status === "expired") throw new DomainError("inviteExpired");

  if ((await profile.countPasskeys(userId)) === 0)
    throw new DomainError("passkeyRequired");

  if (invite.kind === "superadmin") {
    await admins.acceptSuperadminInvite(inviteId, userId);
    return { kind: invite.kind, countryId: null };
  }

  const claimed = await admins.claimCountryAdminInvite(inviteId, userId);
  try {
    await chapters.appointCountryAdmin(
      userId,
      claimed.countryId,
      claimed.invitedByUserId ?? userId,
      { viaInvite: true },
    );
  } catch (error) {
    await admins.releaseInvite(inviteId);
    throw error;
  }
  return { kind: invite.kind, countryId: claimed.countryId };
}
