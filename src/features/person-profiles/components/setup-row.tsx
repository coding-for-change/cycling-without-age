"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowRight, Check, ChevronRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ProgressRing } from "@/features/training/components/pilot-progress-ring";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";
import { dismissSetupAction } from "../actions";
import type { ChecklistStep, ManagedRidersSummary } from "../checklist";
import {
  SetupStepList,
  stepHref,
  stepLabel,
  type SetupStrings,
  type StepContext,
} from "./setup-steps";

type Errors = Dictionary["personProfile"]["errors"];

export type SetupCourse = {
  id: string;
  title: string;
  status: "notStarted" | "inProgress" | "passed" | "exempt";
  ratio: number;
  done: boolean;
  href: string;
};

export type SetupRowVariant = "row" | "hero";

export function SetupRowCard({
  variant = "row",
  steps,
  courses,
  nextCourseId,
  managedRiders,
  aboutYou,
  trainingRequired,
  home,
  strings,
  errors,
  language,
}: {
  variant?: SetupRowVariant;
  steps: ChecklistStep[];
  courses: SetupCourse[];
  nextCourseId: string | null;
  managedRiders: ManagedRidersSummary;
  aboutYou: boolean;
  trainingRequired: boolean;
  home: string;
  strings: SetupStrings;
  errors: Errors;
  language: string;
}) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [dismissing, startDismiss] = useTransition();

  if (hidden) return null;

  const context: StepContext = {
    managedRiders,
    aboutYou,
    trainingRequired,
    home,
    strings,
    language,
  };
  const listed =
    courses.length > 0
      ? steps.filter((step) => step.key !== "training")
      : steps;
  const done =
    listed.filter((step) => step.done).length +
    courses.filter((course) => course.done).length;
  const total = listed.length + courses.length;
  const progress = formatMessage(strings.progress, { done, total }, language);

  const nextCourse = courses.find((course) => course.id === nextCourseId);
  const nextStep =
    listed.find((step) => !step.done && !step.waiting) ??
    listed.find((step) => !step.done);
  const next = nextCourse
    ? {
        text: formatMessage(
          nextCourse.status === "inProgress"
            ? strings.row.resume
            : strings.row.watch,
          { title: nextCourse.title },
          language,
        ),
        href: nextCourse.href,
      }
    : nextStep
      ? {
          text: stepLabel(nextStep.key, context),
          href: nextStep.waiting ? null : stepHref(nextStep.key, context),
        }
      : null;
  const nextLine = next
    ? formatMessage(strings.row.next, { step: next.text }, language)
    : progress;

  const dismiss = () =>
    startDismiss(async () => {
      const result = await dismissSetupAction();
      if (!result.ok) {
        haptics.error();
        toast.error(errors[result.error as keyof Errors] ?? errors.generic);
        return;
      }
      haptics.success();
      toast.success(strings.dismissed);
      setOpen(false);
      setHidden(true);
    });

  const ring = (size: number, stroke: number) => (
    <ProgressRing
      value={total ? done / total : 0}
      size={size}
      stroke={stroke}
      tone="deep"
      label={progress}
    >
      <span
        className={cn(
          "font-display font-bold tabular-nums",
          size > 48 ? "text-sm" : "text-xs",
        )}
      >
        {done}/{total}
      </span>
    </ProgressRing>
  );

  return (
    <>
      {variant === "hero" ? (
        <section
          aria-labelledby="setup-hero-title"
          className="grid gap-4 rounded-2xl bg-canvas p-5 shadow-lift"
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="-m-1 flex min-w-0 items-center gap-4 rounded-xl p-1 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {ring(64, 6)}
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span
                id="setup-hero-title"
                className="font-display text-lg leading-snug font-bold tracking-tight text-balance"
              >
                {strings.row.heroTitle}
              </span>
              <span className="text-sm text-ink-soft">{progress}</span>
              <span className="truncate text-sm font-medium">{nextLine}</span>
            </span>
            <ChevronRight
              aria-hidden
              className="size-5 shrink-0 text-ink-soft"
            />
          </button>
          {next?.href ? (
            <Button
              asChild
              className="min-h-12 w-full rounded-full bg-mint-deep px-6 text-base font-bold text-white hover:bg-mint-deep/90"
            >
              <Link
                href={next.href}
                prefetch
                transitionTypes={["push"]}
              >
                {strings.row.continue}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          ) : null}
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`${strings.title}. ${nextLine}`}
          className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-line bg-canvas px-4 py-3 text-left outline-none transition-colors hover:bg-canvas-deep focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none"
        >
          {ring(44, 4)}
          <span className="grid min-w-0 flex-1 gap-0.5">
            <span className="text-sm font-semibold">{strings.title}</span>
            <span className="truncate text-sm text-ink-soft">{nextLine}</span>
          </span>
          <ChevronRight
            aria-hidden
            className="size-5 shrink-0 text-ink-soft"
          />
        </button>
      )}

      <Drawer
        open={open}
        onOpenChange={setOpen}
        direction="bottom"
        repositionInputs={false}
      >
        <DrawerContent className="bg-canvas data-[vaul-drawer-direction=bottom]:max-h-[94svh] data-[vaul-drawer-direction=bottom]:rounded-t-(--r-tile)">
          <DrawerHeader className="shrink-0 border-b border-line px-5 py-4 text-left">
            <div className="flex items-center gap-3">
              {ring(44, 4)}
              <div className="grid min-w-0 flex-1 gap-0.5">
                <DrawerTitle className="font-display text-lg font-bold tracking-tight text-ink">
                  {strings.title}
                </DrawerTitle>
                <DrawerDescription className="text-sm text-ink-soft">
                  {progress}
                </DrawerDescription>
              </div>
              {variant === "row" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={dismiss}
                  disabled={dismissing}
                  className="-mr-2 text-ink-soft"
                >
                  {strings.dismiss}
                </Button>
              ) : null}
            </div>
          </DrawerHeader>

          <div className="grid min-h-0 flex-1 content-start gap-5 overflow-y-auto px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {courses.length > 0 ? (
              <section
                aria-labelledby="setup-sheet-training"
                className="grid gap-3"
              >
                <h3
                  id="setup-sheet-training"
                  className="text-xs font-semibold tracking-wide text-ink-soft uppercase"
                >
                  {strings.row.sections.training}
                </h3>
                <ul className="grid gap-1.25">
                  {courses.map((course) => (
                    <CourseRow
                      key={course.id}
                      course={course}
                      strings={strings}
                      language={language}
                      onNavigate={() => setOpen(false)}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            {listed.length > 0 ? (
              <section
                aria-labelledby="setup-sheet-steps"
                className="grid gap-3"
              >
                {courses.length > 0 ? (
                  <h3
                    id="setup-sheet-steps"
                    className="text-xs font-semibold tracking-wide text-ink-soft uppercase"
                  >
                    {strings.row.sections.setup}
                  </h3>
                ) : null}
                <SetupStepList
                  steps={listed}
                  context={context}
                  onNavigate={() => setOpen(false)}
                />
              </section>
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function CourseRow({
  course,
  strings,
  language,
  onNavigate,
}: {
  course: SetupCourse;
  strings: SetupStrings;
  language: string;
  onNavigate: () => void;
}) {
  const status =
    course.status === "inProgress"
      ? formatMessage(
          strings.row.status.inProgress,
          { ratio: course.ratio },
          language,
        )
      : strings.row.status[course.status];

  return (
    <li className="flex items-center gap-3">
      <span
        aria-hidden
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-full",
          course.done ? "bg-mint-deep text-white" : "bg-canvas-deep text-ink",
        )}
      >
        {course.done ? (
          <Check className="size-3.5" />
        ) : (
          <GraduationCap className="size-3.5" />
        )}
      </span>
      <Link
        href={course.href}
        transitionTypes={["push"]}
        onClick={onNavigate}
        className="-mx-2 flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1 outline-none transition-colors hover:bg-mint-tint focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none"
      >
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span
            className={cn(
              "truncate text-sm",
              course.done ? "text-ink-soft" : "font-medium",
            )}
          >
            {course.title}
          </span>
          <span className="text-xs text-ink-soft">{status}</span>
        </span>
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-ink-soft"
        />
      </Link>
    </li>
  );
}
