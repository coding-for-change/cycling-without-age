import { ArrowRight, Check, Hourglass } from "lucide-react";
import Link from "next/link";
import { Character } from "@/components/character";
import { ProgressRing } from "@/features/training/components/pilot-progress-ring";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import { courseHref } from "./format";
import type { ReadinessSummary } from "./readiness";

type Strings = Dictionary["pilot"]["training"];

export function ReadinessHeader({
  summary,
  chapterNames,
  strings,
  language,
}: {
  summary: ReadinessSummary;
  chapterNames: Map<string, string>;
  strings: Strings;
  language: string;
}) {
  const { ready, done, total, next } = summary;
  const steps = formatMessage(
    strings.readiness.steps,
    { done, total },
    language,
  );
  const nextHref =
    next?.kind === "course" && next.course.variantCourseId
      ? courseHref(next.course.variantCourseId)
      : null;

  return (
    <section
      aria-labelledby="training-readiness"
      className={cn(
        "relative grid gap-4 overflow-hidden rounded-(--r-tile) p-5",
        ready ? "bg-mint-tint" : "border border-line bg-canvas",
      )}
    >
      <div className="flex items-center gap-4">
        <ProgressRing
          value={summary.ratio}
          size={84}
          stroke={8}
          tone={ready ? "deep" : "mint"}
          label={steps}
        >
          {ready ? (
            <Check
              className="size-8 text-mint-ink animate-training-check"
              strokeWidth={3}
              aria-hidden
            />
          ) : (
            <span className="grid justify-items-center leading-none">
              <span className="font-display text-2xl font-bold tabular-nums">
                {done}
              </span>
              <span className="mt-1 text-xs text-ink-soft">
                {formatMessage(strings.quiz.outOf, { total }, language)}
              </span>
            </span>
          )}
        </ProgressRing>
        <div className="grid min-w-0 flex-1 gap-1">
          <h2
            id="training-readiness"
            className="text-lg leading-snug tracking-tight sm:text-xl"
          >
            {ready ? strings.readiness.readyTitle : strings.readiness.title}
          </h2>
          <p className="text-sm text-ink-soft">
            {ready ? strings.readiness.readyBody : steps}
          </p>
        </div>
        {ready ? (
          <Character
            size={76}
            expression="fier"
            follow={false}
            className="-my-2 hidden shrink-0 text-mint sm:block motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-90 motion-safe:delay-300 motion-safe:duration-500 motion-safe:fill-mode-both"
          />
        ) : null}
      </div>

      {next ? (
        nextHref ? (
          <Link
            href={nextHref}
            prefetch
            transitionTypes={["push"]}
            className="group flex min-h-11 items-center gap-3 rounded-xl bg-mint-tint px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-mint/50 motion-reduce:transition-none"
          >
            <span className="min-w-0 flex-1 truncate">
              {formatMessage(
                strings.readiness.next,
                { title: next.kind === "course" ? next.course.name : "" },
                language,
              )}
            </span>
            <ArrowRight
              className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
              aria-hidden
            />
          </Link>
        ) : next.kind === "inPerson" ? (
          <p className="flex min-h-11 items-center gap-3 rounded-xl bg-canvas-deep px-3.5 py-2.5 text-sm">
            <Hourglass
              className="size-4 shrink-0 text-ink-soft"
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              {strings.readiness.nextInPerson}
            </span>
          </p>
        ) : null
      ) : null}

      {summary.chapters ? (
        <ul className="grid gap-1.25 border-t border-line pt-3">
          {summary.chapters.map((chapter) => (
            <li
              key={chapter.chapterId}
              className="flex items-center gap-3 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">
                {chapterNames.get(chapter.chapterId) ?? ""}
              </span>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                  chapter.ready
                    ? "bg-mint-deep text-white"
                    : "bg-canvas-deep text-ink-soft",
                )}
              >
                {chapter.ready ? (
                  <Check
                    className="size-3"
                    strokeWidth={3}
                    aria-hidden
                  />
                ) : null}
                {chapter.ready
                  ? strings.readiness.chapterReady
                  : strings.readiness.chapterNotReady}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {summary.applicant ? (
        <p className="text-xs text-ink-soft">{strings.readiness.applicant}</p>
      ) : null}
    </section>
  );
}
