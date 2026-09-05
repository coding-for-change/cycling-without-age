import { createElement } from "react";
import { accounts } from "@/features/accounts";
import type { InviteInput } from "@/features/accounts";
import { activity } from "@/features/activity";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { profile } from "@/features/profile";
import { getEmailStrings } from "@/emails/strings";
import { InviteEmail } from "@/emails/invite";
import { APP_URL } from "@/lib/app-url";
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
  locale: string | null;
  input: InviteInput;
}) {
  const { chapterId, name, email, role } = input;

  const { userId, created } = await accounts.provisionUser({
    name,
    contact: email,
    createdByUserId: inviterUserId,
  });
  await membership.grantChapterRole(userId, chapterId, role);

  await mailInvite({ userId, email, chapterId, inviterName, role, locale });

  await activity.record({
    userId,
    actorUserId: inviterUserId,
    chapterId,
    type: "invited",
    payload: { role },
  });

  return { created };
}

async function mailInvite({
  userId,
  email,
  chapterId,
  inviterName,
  role,
  locale,
}: {
  userId: string;
  email: string;
  chapterId: string;
  inviterName: string;
  role: "admin" | "pilot";
  locale: string | null;
}) {
  try {
    const [account, chapter] = await Promise.all([
      profile.getProfile(userId),
      chapters.getChapter(chapterId),
    ]);

    const strings = getEmailStrings(account?.locale ?? locale);
    const copy = strings.invite;
    const chapterName = chapter?.name ?? "Cycling Without Age";
    const roleLabel = strings.roles[role];
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
        strings: copy,
        chapterName,
        inviterName,
        roleLabel,
        href: `${APP_URL}/sign-in?next=${encodeURIComponent(role === "admin" ? "/admin" : "/pilot")}`,
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
