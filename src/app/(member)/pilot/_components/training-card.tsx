import Link from "next/link";
import { cacheLife } from "next/cache";
import { ArrowRight, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressRing } from "@/features/training/components/pilot-progress-ring";
import { requirePerspective } from "@/lib/auth-guards";
import { isTrainingRequired } from "@/lib/feature-flags";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { ownReadiness } from "@/use-cases/pilot-readiness";
import { MEMBER_LIFE } from "../../_components/instant";
import { courseHref } from "../training/_components/format";
import { summarizeReadiness } from "../training/_components/readiness";

const TRAINING_HREF = "/pilot/training";

export async function TrainingCard() {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const session = await requirePerspective("pilot");
  if (!isTrainingRequired()) return null;
  const [dict, language] = await Promise.all([getDictionary(), getLocale()]);
  const own = await ownReadiness(session.user.id, language);
  if (own.chapters.length === 0) return null;

  const summary = summarizeReadiness(own);
  if (summary.ready) return null;

  const strings = dict.pilot.home.training;
  const steps = formatMessage(
    strings.steps,
    { done: summary.done, total: summary.total },
    language,
  );
  const { next } = summary;
  const course = next?.kind === "course" ? next.course : null;
  const href = course?.variantCourseId
    ? courseHref(course.variantCourseId)
    : TRAINING_HREF;

  return (
    <section
      aria-labelledby="home-training-title"
      className="grid gap-4 rounded-2xl border border-line bg-canvas p-4 sm:flex sm:items-center"
    >
      <Link
        href={TRAINING_HREF}
        transitionTypes={["push"]}
        className="-m-1 flex min-w-0 flex-1 items-center gap-4 rounded-xl p-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <ProgressRing
          value={summary.ratio}
          size={56}
          stroke={6}
          label={steps}
        >
          <span className="font-display text-sm font-bold tabular-nums">
            {summary.done}/{summary.total}
          </span>
        </ProgressRing>
        <div className="grid min-w-0 flex-1 gap-0.5">
          <h2
            id="home-training-title"
            className="text-base leading-snug tracking-tight"
          >
            {strings.title}
          </h2>
          <span className="truncate text-sm text-ink-soft">
            {course
              ? formatMessage(strings.next, { title: course.name }, language)
              : strings.nextInPerson}
          </span>
        </div>
      </Link>
      {course ? (
        <Button
          asChild
          className="min-h-12 w-full rounded-full bg-mint-deep px-6 text-base font-bold text-white hover:bg-mint-deep/90 sm:min-h-11 sm:w-auto sm:text-sm"
        >
          <Link
            href={href}
            prefetch
            transitionTypes={["push"]}
          >
            {strings.continue}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      ) : (
        <p className="flex items-start gap-2 rounded-xl bg-canvas-deep px-3.5 py-2.5 text-sm text-ink-soft sm:max-w-60">
          <Hourglass
            className="mt-0.5 size-4 shrink-0"
            aria-hidden
          />
          {strings.waiting}
        </p>
      )}
    </section>
  );
}

export function TrainingCardFallback() {
  return (
    <div className="grid gap-4 rounded-2xl border border-line bg-canvas p-4 sm:flex sm:items-center">
      <div className="flex flex-1 items-center gap-4">
        <Skeleton className="size-14 shrink-0 rounded-full" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-5 w-52 max-w-full" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <Skeleton className="h-12 w-full rounded-full sm:h-11 sm:w-32" />
    </div>
  );
}
