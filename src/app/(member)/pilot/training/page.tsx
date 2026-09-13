import { Suspense } from "react";
import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { membership } from "@/features/membership";
import { requireAuth } from "@/lib/auth-guards";
import { getDictionary } from "@/lib/i18n";
import { MemberEmpty } from "../../_components/member-empty";
import {
  MemberPageFallback,
  MemberPageShell,
} from "../../_components/member-page";

export default function PilotTrainingPage() {
  return (
    <MemberPageShell>
      <Suspense fallback={<MemberPageFallback />}>
        <Training />
      </Suspense>
    </MemberPageShell>
  );
}

/**
 * Open to anyone who is riding or waiting to hear back — being a member of a
 * chapter is not the bar, having applied is. So this guards itself rather than
 * leaning on `requirePerspective`.
 */
async function Training() {
  const session = await requireAuth();
  const [dict, memberships, applications] = await Promise.all([
    getDictionary(),
    membership.listMembershipsOfUser(session.user.id),
    membership.listApplicationsOfUser(session.user.id),
  ]);

  const allowed =
    memberships.some((m) => m.roles.includes("pilot")) ||
    applications.some((a) => a.status === "pending");
  if (!allowed) redirect(applications.length > 0 ? "/pilot" : "/onboarding");

  const strings = dict.pilot.training;

  return (
    <>
      <h1 className="text-2xl tracking-tight md:text-3xl">{strings.title}</h1>
      <MemberEmpty
        icon={GraduationCap}
        className="flex-1 justify-start rounded-none border-none pt-16"
      >
        {strings.body}
      </MemberEmpty>
    </>
  );
}
