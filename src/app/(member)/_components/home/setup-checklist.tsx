import { cacheLife } from "next/cache";
import { SetupChecklistCard } from "@/features/person-profiles/components/setup-checklist-card";
import { perspectiveViewerSession } from "@/lib/auth-guards";
import { getDictionary, getLocale } from "@/lib/i18n";
import { PERSPECTIVE_HOME } from "@/lib/redirects";
import { isPilotOrApplicant } from "@/use-cases/pilot-steps";
import { getSetupChecklist } from "@/use-cases/setup-checklist";
import type { MemberPerspective } from "../../nav";
import { MEMBER_LIFE } from "../instant";

export async function SetupChecklist({
  perspective,
}: {
  perspective: MemberPerspective;
}) {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const session = await perspectiveViewerSession(perspective);
  if (!session) return null;
  if (perspective === "pilot" && !(await isPilotOrApplicant(session.user.id)))
    return null;

  const [checklist, dict, language] = await Promise.all([
    getSetupChecklist(session.user.id, perspective),
    getDictionary(),
    getLocale(),
  ]);
  if (!checklist.visible) return null;

  return (
    <SetupChecklistCard
      steps={checklist.steps}
      managedRiders={checklist.managedRiders}
      aboutYou={checklist.aboutYou}
      home={PERSPECTIVE_HOME[perspective]}
      strings={dict.setupChecklist}
      errors={dict.personProfile.errors}
      language={language}
    />
  );
}
