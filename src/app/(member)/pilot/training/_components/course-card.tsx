import Link from "next/link";
import { BadgeCheck, Check } from "lucide-react";
import type { CourseCard as CourseCardData } from "@/use-cases/training-access";
import type { Locale as NotationLocale } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import { CoursePoster } from "./course-poster";
import { courseHref, courseMeta, languageName } from "./format";

export function CourseCard({
  course,
  strings,
  language,
  notation,
  priority = false,
  exempt = false,
}: {
  course: CourseCardData;
  strings: Dictionary["pilot"]["training"]["card"];
  language: string;
  notation: NotationLocale;
  priority?: boolean;
  exempt?: boolean;
}) {
  const { progress } = course;
  const passed = progress.passedAt !== null;
  const started = progress.startedAt !== null || progress.completedElements > 0;
  const ratio = passed || exempt ? 1 : progress.percent / 100;
  const foreign = course.language.split("-")[0] !== language.split("-")[0];

  return (
    <Link
      href={courseHref(course.courseId)}
      prefetch
      transitionTypes={["push"]}
      className="group grid overflow-hidden rounded-(--r-tile) border border-line bg-canvas transition-[border-color,box-shadow] duration-200 hover:border-ink-faint hover:shadow-soft focus-visible:outline-2 focus-visible:outline-mint-deep motion-reduce:transition-none"
    >
      <div className="relative">
        <CoursePoster
          courseId={course.courseId}
          src={course.poster}
          priority={priority}
        />
        {passed ? (
          <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-mint-deep px-2.5 py-1 text-xs font-medium text-white">
            <Check
              className="size-3.5"
              strokeWidth={3}
              aria-hidden
            />
            {strings.passed}
          </span>
        ) : exempt ? (
          <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-paper/90 px-2.5 py-1 text-xs font-medium backdrop-blur">
            <BadgeCheck
              className="size-3.5 text-mint-ink"
              aria-hidden
            />
            {strings.exempt}
          </span>
        ) : null}
        {foreign ? (
          <span className="absolute top-3 right-3 rounded-full bg-paper/90 px-2.5 py-1 text-xs font-medium backdrop-blur">
            {languageName(course.language, language)}
          </span>
        ) : null}
      </div>
      <div className="grid gap-2 p-4">
        <p className="font-display text-base leading-snug font-bold text-balance">
          {course.title}
        </p>
        <p className="text-sm text-ink-soft">
          {courseMeta(
            course.lessonCount,
            course.durationSeconds,
            strings.lessons,
            language,
            notation,
          )}
        </p>
        <div className="mt-1 grid gap-1.5">
          <span
            className="h-1.5 overflow-hidden rounded-full bg-mint-tint"
            aria-hidden
          >
            <span
              className={cn(
                "block h-full origin-left rounded-full",
                passed ? "bg-mint-deep" : "bg-mint",
              )}
              style={{ transform: `scaleX(${ratio})` }}
            />
          </span>
          <span className="text-xs text-ink-soft">
            {passed
              ? strings.passed
              : exempt
                ? strings.exemptHint
                : progress.nextElementKind === "quiz"
                  ? strings.quizReady
                  : started
                    ? formatMessage(
                        strings.progress,
                        {
                          done: progress.completedElements,
                          total: progress.totalElements,
                        },
                        language,
                      )
                    : strings.notStarted}
          </span>
        </div>
      </div>
    </Link>
  );
}
