import { accounts } from "@/features/accounts";
import type { InviteInput } from "@/features/accounts";
import { membership } from "@/features/membership";
import { profile } from "@/features/profile";
import type { Locale } from "@/lib/i18n/locales";

export async function inviteChapterUser({
  inviterUserId,
  locale,
  input,
}: {
  inviterUserId: string;
  locale: Locale;
  input: InviteInput;
}) {
  const { chapterId, name, email, roles } = input;

  const { userId, created } = await accounts.provisionUser({
    name,
    contact: email,
    createdByUserId: inviterUserId,
  });

  // An invitee has never chosen a language, so they borrow the inviter's until
  // onboarding overwrites it.
  if (created || !(await profile.getProfile(userId))?.locale) {
    await profile.setLocale(userId, locale);
  }

  await membership.inviteMember({
    userId,
    chapterId,
    actorUserId: inviterUserId,
    roles,
  });

  return { created };
}
