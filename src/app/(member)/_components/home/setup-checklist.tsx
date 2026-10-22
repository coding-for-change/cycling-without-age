import { cacheLife } from "next/cache";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SetupRowCard,
  type SetupCourse,
  type SetupRowVariant,
} from "@/features/person-profiles/components/setup-row";
import { isSatisfied } from "@/features/training/requirements";
import { perspectiveViewerSession } from "@/lib/auth-guards";
import { getDictionary, getLocale } from "@/lib/i18n";
import { PERSPECTIVE_HOME } from "@/lib/redirects";
import { ownReadiness } from "@/use-cases/pilot-readiness";
import { isPilotOrApplicant } from "@/use-cases/pilot-steps";
import { getSetupChecklist } from "@/use-cases/setup-checklist";
import type { MemberPerspective } from "../../nav";
import { courseHref } from "../../pilot/training/_components/format";
import { summarizeReadiness } from "../../pilot/training/_components/readiness";
import { MEMBER_LIFE } from "../instant";

const TRAINING_HREF = "/pilot/training";

async function trainingOf(userId: string, language: string) {
  const own = await ownReadiness(userId, language);
  if (own.chapters.length === 0) return null;
  const summary = summarizeReadiness(own);
  const courses: SetupCourse[] = summary.required.map((course) => ({
    id: course.familyId,
    title: course.name,
    status: course.status,
    ratio: course.percent / 100,
    done: isSatisfied(course.status),
    href: course.variantCourseId
      ? courseHref(course.variantCourseId)
      : TRAINING_HREF,
  }));
  return {
    courses,
    ready: summary.ready,
    nextCourseId:
      summary.next?.kind === "course" ? summary.next.course.familyId : null,
  };
}

export async function SetupRow({
  perspective,
  variant = "row",
}: {
  perspective: MemberPerspective;
  variant?: SetupRowVariant;
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
  const training =
    perspective === "pilot" && checklist.trainingRequired
      ? await trainingOf(session.user.id, language)
      : null;
  const trainingOpen = training !== null && !training.ready;
  const hero = variant === "hero" && trainingOpen;
  if (!checklist.visible && !hero) return null;

  return (
    <SetupRowCard
      variant={hero ? "hero" : "row"}
      steps={checklist.steps}
      courses={training?.courses ?? []}
      nextCourseId={training?.nextCourseId ?? null}
      managedRiders={checklist.managedRiders}
      aboutYou={checklist.aboutYou}
      trainingRequired={checklist.trainingRequired}
      home={PERSPECTIVE_HOME[perspective]}
      strings={dict.setupChecklist}
      errors={dict.personProfile.errors}
      language={language}
    />
  );
}

export function SetupRowFallback({
  variant = "row",
}: {
  variant?: SetupRowVariant;
}) {
  if (variant === "hero")
    return (
      <div className="grid gap-4 rounded-2xl bg-canvas p-5 shadow-lift">
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 shrink-0 rounded-full" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-5 w-48 max-w-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    );
  return (
    <div className="flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-canvas px-4 py-3">
      <Skeleton className="size-11 shrink-0 rounded-full" />
      <div className="grid flex-1 gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-48 max-w-full" />
      </div>
    </div>
  );
}
