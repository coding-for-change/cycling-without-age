import { Suspense } from "react";
import { notFound } from "next/navigation";
import { admins, inviteId as inviteIdSchema } from "@/features/admins";
import { profile } from "@/features/profile";
import { requireAuth } from "@/lib/auth-guards";
import { ORG_NAME } from "@/lib/brand";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { StepSkeleton } from "../../_components/step";
import { StepTransition } from "../../_components/step-transition";
import { PasskeyStep } from "../../onboarding/_components/passkey-step";
import { AdminInviteStep } from "./_components/admin-invite-step";

type Params = Promise<{ inviteId: string }>;

export default function AdminInvitePage({ params }: { params: Params }) {
  return (
    <StepTransition>
      <Suspense fallback={<StepSkeleton />}>
        <AdminInvite params={params} />
      </Suspense>
    </StepTransition>
  );
}

async function AdminInvite({ params }: { params: Params }) {
  const session = await requireAuth();
  const parsed = inviteIdSchema.safeParse((await params).inviteId);
  if (!parsed.success) notFound();

  const invite = await admins.getInvite(parsed.data);
  if (!invite || invite.userId !== session.user.id) notFound();

  const [dict, locale, passkeys] = await Promise.all([
    getDictionary(),
    getLocale(),
    profile.countPasskeys(session.user.id),
  ]);
  const strings = dict.adminInvite;
  const status = admins.inviteStatusOf(invite);
  const say = (template: string) =>
    formatMessage(
      template,
      {
        inviter: invite.invitedBy?.name ?? ORG_NAME,
        country: invite.country?.name ?? ORG_NAME,
      },
      locale,
    );

  if (status === "pending" && passkeys === 0) {
    const { admin, ...passkey } = dict.passkey;
    return (
      <PasskeyStep
        progress={null}
        requiredNext={`/admin-invite/${invite.id}`}
        strings={{
          ...passkey,
          title: strings.passkeyTitle,
          body: strings.passkeyBody,
          failed: admin.failed,
        }}
      />
    );
  }

  const role = strings[invite.kind];

  return (
    <AdminInviteStep
      inviteId={invite.id}
      status={status}
      strings={{
        title: say(role.title),
        body: say(role.body),
        accept: strings.accept,
        accepted: strings.accepted,
        expired: {
          title: strings.expired.title,
          body: say(strings.expired.body),
        },
        revoked: {
          title: strings.revoked.title,
          body: say(strings.revoked.body),
        },
        errors: strings.errors,
      }}
    />
  );
}
