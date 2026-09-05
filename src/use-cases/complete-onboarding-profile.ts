import { createElement } from "react";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import type { PersonalDetailsInput } from "@/features/profile";
import { getEmailStrings, resolveEmailLocale } from "@/emails/strings";
import { WelcomeEmail } from "@/emails/welcome";
import { sendMail } from "@/lib/mailer";
import type { OnboardingRole } from "@/lib/onboarding";

const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export async function completeOnboardingProfile({
  userId,
  role,
  details,
  locale,
}: {
  userId: string;
  role: OnboardingRole;
  details: PersonalDetailsInput | null;
  locale: string | null;
}) {
  const chapterId = await chapterOf(userId, role);

  if (!details) {
    await profile.markManagesOthers(userId);
  } else {
    await profile.setPersonalDetails(userId, details);
    if (role === "passenger" && chapterId) {
      await passengers.saveOwnPassenger({
        ...details,
        chapterId,
        managedByUserId: userId,
        userId,
      });
    }
  }

  if (locale) await profile.setLocale(userId, locale);
  await sendWelcome({ userId, role, chapterId, locale });
}

/** A pilot's chapter is still an application at this point, not a membership. */
async function chapterOf(userId: string, role: OnboardingRole) {
  if (role === "passenger") {
    const joined = await membership.listMembershipsOfUser(userId);
    return (
      joined.find((m) => m.roles.includes("passenger"))?.chapterId ??
      joined[0]?.chapterId ??
      null
    );
  }
  const applied = await membership.listApplicationsOfUser(userId);
  return applied[0]?.chapterId ?? null;
}

async function sendWelcome({
  userId,
  role,
  chapterId,
  locale,
}: {
  userId: string;
  role: OnboardingRole;
  chapterId: string | null;
  locale: string | null;
}) {
  let claimed = false;
  try {
    const account = await profile.getProfile(userId);
    if (!account?.email) return;
    claimed = await profile.claimWelcomeEmail(userId);
    if (!claimed) return;

    const emailLocale = resolveEmailLocale(locale ?? account.locale);
    const strings = getEmailStrings(emailLocale);
    const copy =
      role === "pilot" ? strings.welcomePilot : strings.welcomePassenger;
    const chapterName = chapterId
      ? ((await chapters.getChapter(chapterId))?.name ?? "Cycling Without Age")
      : "Cycling Without Age";

    await sendMail({
      to: account.email,
      subject: copy.subject,
      text: `${copy.heading}\n\n${copy.intro.replace("{chapter}", chapterName)}\n\n${copy.how.join("\n")}`,
      react: createElement(WelcomeEmail, {
        locale: emailLocale,
        strings: copy,
        chapterName,
        href: `${baseUrl}${role === "pilot" ? "/pilot" : "/passenger"}`,
      }),
    });
  } catch (error) {
    console.error("[onboarding] welcome email failed", error);
    // A claim left behind by a failed send would make every later attempt
    // believe the mail already went out.
    if (claimed) {
      await profile
        .releaseWelcomeEmail(userId)
        .catch((releaseError) =>
          console.error(
            "[onboarding] welcome email not released",
            releaseError,
          ),
        );
    }
  }
}
