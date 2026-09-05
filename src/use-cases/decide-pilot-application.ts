import { createElement } from "react";
import { activity } from "@/features/activity";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { profile } from "@/features/profile";
import { ApplicationDecisionEmail } from "@/emails/application-decision";
import { getEmailStrings } from "@/emails/strings";
import { APP_URL } from "@/lib/app-url";
import { sendMail } from "@/lib/mailer";
import { fill } from "@/lib/utils";

type Decision = {
  applicationId: string;
  actorUserId: string;
  approve: boolean;
  note?: string;
};

export async function decidePilotApplication({
  applicationId,
  actorUserId,
  approve,
  note,
}: Decision) {
  const decided = await membership.decideApplication({
    applicationId,
    decidedByUserId: actorUserId,
    approve,
    note,
  });

  const subject = {
    userId: decided.userId,
    actorUserId,
    chapterId: decided.chapterId,
  };

  await activity.record({
    ...subject,
    type: approve ? "applicationApproved" : "applicationRejected",
    ...(decided.decisionNote
      ? { payload: { note: decided.decisionNote } }
      : {}),
  });

  await mailDecision({ ...subject, approve, note: decided.decisionNote });
  return decided;
}

async function mailDecision({
  userId,
  actorUserId,
  chapterId,
  approve,
  note,
}: {
  userId: string;
  actorUserId: string;
  chapterId: string;
  approve: boolean;
  note: string | null;
}) {
  try {
    const account = await profile.getProfile(userId);
    if (!account?.email) return;

    const strings = getEmailStrings(account.locale);
    const copy = approve
      ? strings.applicationApproved
      : strings.applicationRejected;
    const chapterName =
      (await chapters.getChapter(chapterId))?.name ?? "Cycling Without Age";
    const intro = fill(copy.intro, { chapter: chapterName });

    await sendMail({
      to: account.email,
      subject: fill(copy.subject, { chapter: chapterName }),
      text: `${copy.heading}\n\n${intro}${note ? `\n\n${copy.noteHeading}\n${note}` : ""}`,
      react: createElement(ApplicationDecisionEmail, {
        strings: copy,
        chapterName,
        note,
        href: `${APP_URL}/pilot`,
      }),
    });

    await activity.record({
      userId,
      actorUserId,
      chapterId,
      type: "emailSent",
      payload: { template: approve ? "approval" : "rejection" },
    });
  } catch (error) {
    console.error("[application] decision email failed", error);
  }
}
