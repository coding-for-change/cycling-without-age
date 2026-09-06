import { createElement } from "react";
import { accounts } from "@/features/accounts";
import type { InviteInput, InviteRole } from "@/features/accounts";
import { activity } from "@/lib/activity";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { profile } from "@/features/profile";
import { getEmailStrings, resolveEmailLocale } from "@/emails/strings";
import { InviteEmail } from "@/emails/invite";
import { afterResponse } from "@/lib/after-response";
import { APP_URL } from "@/lib/app-url";
import { formatList, wordsLocale } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";
import { sendMail } from "@/lib/mailer";
import { fill } from "@/lib/utils";

export async function inviteChapterUser({
  inviterUserId,
  inviterName,
  locale,
  input,
}: {
  inviterUserId: string;
  inviterName: string;
  locale: Locale;
  input: InviteInput;
}) {
  const { chapterId, name, email, roles } = input;

  const { userId, created } = await accounts.provisionUser({
    name,
    contact: email,
    createdByUserId: inviterUserId,
  });
  await membership.grantChapterRoles(userId, chapterId, roles);

  await afterResponse(() =>
    mailInvite({ userId, email, chapterId, inviterName, roles, locale }),
  );

  await activity.record({
    userId,
    actorUserId: inviterUserId,
    chapterId,
    type: "invited",
    payload: { roles: roles.join(",") },
  });

  return { created };
}

async function mailInvite({
  userId,
  email,
  chapterId,
  inviterName,
  roles,
  locale,
}: {
  userId: string;
  email: string;
  chapterId: string;
  inviterName: string;
  roles: InviteRole[];
  locale: Locale;
}) {
  try {
    const [account, chapter] = await Promise.all([
      profile.getProfile(userId),
      chapters.getChapter(chapterId),
    ]);

    const language = account?.locale ?? locale;
    const emailLocale = resolveEmailLocale(language);
    const strings = getEmailStrings(emailLocale);
    const copy = strings.invite;
    const chapterName = chapter?.name ?? "Cycling Without Age";
    const roleLabel = formatList(
      roles.map((role) => strings.roles[role]),
      wordsLocale(language),
    );
    const intro = fill(copy.intro, {
      inviter: inviterName,
      chapter: chapterName,
      role: roleLabel,
    });

    await sendMail({
      to: email,
      subject: fill(copy.subject, { chapter: chapterName }),
      text: `${copy.heading}\n\n${intro}\n\n${copy.how}`,
      react: createElement(InviteEmail, {
        locale: emailLocale,
        strings: copy,
        chapterName,
        inviterName,
        roleLabel,
        href: `${APP_URL}/sign-in?next=${encodeURIComponent(roles.includes("admin") ? "/admin" : "/pilot")}`,
      }),
    });

    await activity.record({
      userId,
      chapterId,
      type: "emailSent",
      payload: { template: "invite" },
    });
  } catch (error) {
    console.error("[invite] invitation email failed", error);
  }
}
