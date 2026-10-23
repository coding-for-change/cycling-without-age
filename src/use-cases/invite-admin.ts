import { accounts } from "@/features/accounts";
import { admins } from "@/features/admins";
import type { InviteeInput } from "@/features/admins";
import { chapters } from "@/features/chapters";
import { profile } from "@/features/profile";
import { DomainError } from "@/lib/domain-error";
import type { Locale } from "@/lib/i18n/locales";

export type AdminInviteTarget =
  { kind: "superadmin" } | { kind: "countryAdmin"; countryId: string };

export async function inviteAdmin({
  actorUserId,
  locale,
  invitee,
  target,
}: {
  actorUserId: string;
  locale: Locale;
  invitee: InviteeInput;
  target: AdminInviteTarget;
}) {
  if (target.kind === "countryAdmin") {
    if (!(await chapters.getCountry(target.countryId)))
      throw new DomainError("unknownCountry");
  }

  const { userId, created } = await accounts.provisionUser({
    name: invitee.name,
    contact: invitee.email,
    createdByUserId: actorUserId,
  });

  if (created || !(await profile.getProfile(userId))?.locale) {
    await profile.setLocale(userId, locale);
  }

  if (
    target.kind === "countryAdmin" &&
    (await chapters.listCountriesAdministeredBy(userId)).includes(
      target.countryId,
    )
  )
    throw new DomainError("alreadyAdmin");

  const { inviteId } = await admins.createInvite({
    ...target,
    userId,
    actorUserId,
  });
  return { userId, created, inviteId };
}
