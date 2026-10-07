"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Accessibility,
  Bell,
  Bike,
  Camera,
  Check,
  ChevronRight,
  GraduationCap,
  Heart,
  KeyRound,
  MessageCircle,
  PenLine,
  ShieldCheck,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";
import { dismissSetupAction, tickPilotStepAction } from "../actions";
import type {
  ChecklistStep,
  ChecklistStepKey,
  ManagedRidersSummary,
} from "../checklist";
import { PILOT_STEPS, subjectSlug, type PilotStep } from "../schemas";

type Strings = Dictionary["setupChecklist"];
type Errors = Dictionary["personProfile"]["errors"];

const ICONS: Record<ChecklistStepKey, LucideIcon> = {
  photo: Camera,
  bio: PenLine,
  interests: Heart,
  prompt: MessageCircle,
  accessibility: Accessibility,
  managedRiders: UsersRound,
  passkey: KeyRound,
  push: Bell,
  trainingVideos: GraduationCap,
  workshop: Users,
  firstRide: Bike,
};

const PROFILE_STEPS = new Set<ChecklistStepKey>([
  "photo",
  "bio",
  "interests",
  "prompt",
  "accessibility",
  "managedRiders",
]);

const isPilotStep = (key: ChecklistStepKey): key is PilotStep =>
  (PILOT_STEPS as readonly string[]).includes(key);

const ABOUT_YOU_STEPS = new Set<ChecklistStepKey>(["photo", "bio"]);

const hrefOf = (
  key: ChecklistStepKey,
  home: string,
  riders: ManagedRidersSummary,
) => {
  if (key === "managedRiders" && riders.missing === 1 && riders.focus)
    return `${home}/profile/${subjectSlug(riders.focus.ref)}`;
  if (PROFILE_STEPS.has(key)) return `${home}/profile`;
  if (key === "trainingVideos") return "/pilot/training";
  return null;
};

const hintOf = (key: ChecklistStepKey, strings: Strings, aboutYou: boolean) => {
  if (aboutYou && ABOUT_YOU_STEPS.has(key)) return strings.aboutYou;
  return key in strings.hints
    ? strings.hints[key as keyof Strings["hints"]]
    : null;
};

export function SetupChecklistCard({
  steps,
  managedRiders,
  aboutYou,
  home,
  strings,
  errors,
  language,
}: {
  steps: ChecklistStep[];
  managedRiders: ManagedRidersSummary;
  aboutYou: boolean;
  home: string;
  strings: Strings;
  errors: Errors;
  language: string;
}) {
  const [hidden, setHidden] = useState(false);
  const [dismissing, startDismiss] = useTransition();
  const [, startTick] = useTransition();
  const [ticked, setTicked] = useOptimistic(
    steps,
    (current, change: { key: PilotStep; done: boolean }) =>
      current.map((step) =>
        step.key === change.key ? { ...step, done: change.done } : step,
      ),
  );

  if (hidden) return null;

  const labelOf = (key: ChecklistStepKey) =>
    key === "managedRiders"
      ? formatMessage(
          strings.steps.managedRiders,
          {
            count: managedRiders.missing || managedRiders.total,
            name: managedRiders.focus?.name ?? "",
          },
          language,
        )
      : strings.steps[key];

  const done = ticked.filter((step) => step.done);
  const open = ticked.filter((step) => !step.done);
  const percent = Math.round((done.length / ticked.length) * 100);

  const fail = (error: keyof Errors | string) => {
    haptics.error();
    toast.error(errors[error as keyof Errors] ?? errors.generic);
  };

  const tick = (key: PilotStep, next: boolean) =>
    startTick(async () => {
      setTicked({ key, done: next });
      const result = await tickPilotStepAction({ step: key, done: next });
      if (!result.ok) return fail(result.error);
      if (next) haptics.success();
    });

  const dismiss = () =>
    startDismiss(async () => {
      const result = await dismissSetupAction();
      if (!result.ok) return fail(result.error);
      haptics.success();
      toast.success(strings.dismissed);
      setHidden(true);
    });

  return (
    <section
      aria-labelledby="setup-checklist-title"
      className="grid gap-4 rounded-2xl bg-mint-tint p-5"
    >
      <header className="flex items-start gap-3">
        <div className="grid min-w-0 flex-1 gap-1">
          <h2
            id="setup-checklist-title"
            className="font-display text-lg font-bold"
          >
            {strings.title}
          </h2>
          <p className="text-sm text-ink-soft">
            {formatMessage(
              strings.progress,
              { done: done.length, total: ticked.length },
              language,
            )}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={dismiss}
          disabled={dismissing}
          className="-mt-1 -mr-2 text-ink-soft"
        >
          {strings.dismiss}
        </Button>
      </header>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={ticked.length}
        aria-valuenow={done.length}
        aria-label={strings.title}
        className="h-1 overflow-hidden rounded-full bg-canvas"
      >
        <div
          className="h-full rounded-full bg-mint transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ul className="grid gap-1.25">
        {open.map((step) => (
          <StepRow
            key={step.key}
            step={step}
            label={labelOf(step.key)}
            hint={hintOf(step.key, strings, aboutYou)}
            href={hrefOf(step.key, home, managedRiders)}
            strings={strings}
            onTick={isPilotStep(step.key) ? tick : undefined}
          />
        ))}
      </ul>

      {done.length > 0 ? (
        <ul className="grid gap-1 border-t border-line pt-3">
          {done.map((step) => (
            <StepRow
              key={step.key}
              step={step}
              label={labelOf(step.key)}
              hint={null}
              href={null}
              strings={strings}
              onTick={isPilotStep(step.key) ? tick : undefined}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function StepRow({
  step,
  label,
  hint,
  href,
  strings,
  onTick,
}: {
  step: ChecklistStep;
  label: string;
  hint: string | null;
  href: string | null;
  strings: Strings;
  onTick?: (key: PilotStep, next: boolean) => void;
}) {
  const Icon = ICONS[step.key];
  const toggleable = onTick && isPilotStep(step.key) && !step.confirmed;

  const marker = toggleable ? (
    <button
      type="button"
      role="checkbox"
      aria-checked={step.done}
      aria-label={`${step.done ? strings.markUndone : strings.markDone}: ${label}`}
      onClick={() => onTick(step.key as PilotStep, !step.done)}
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-full border outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none",
        step.done
          ? "border-transparent bg-mint-deep text-white"
          : "border-ink/30 bg-canvas hover:border-ink",
      )}
    >
      {step.done ? (
        <Check
          aria-hidden
          className="size-3.5"
        />
      ) : null}
    </button>
  ) : (
    <span
      aria-hidden
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-full",
        step.done ? "bg-mint-deep text-white" : "bg-canvas text-ink",
      )}
    >
      {step.done ? (
        <Check className="size-3.5" />
      ) : (
        <Icon className="size-3.5" />
      )}
    </span>
  );

  const text = (
    <span className="grid min-w-0 flex-1 gap-0.5">
      <span
        className={cn(
          "text-sm",
          step.done
            ? "text-ink-soft line-through decoration-ink/30"
            : "font-medium",
        )}
      >
        {label}
      </span>
      {hint ? <span className="text-xs text-ink-soft">{hint}</span> : null}
    </span>
  );

  const badge = step.confirmed ? (
    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-ink-soft">
      <ShieldCheck
        aria-hidden
        className="size-3.5 text-mint-ink"
      />
      {strings.confirmed}
    </span>
  ) : null;

  return (
    <li className="flex items-center gap-3">
      {marker}
      {href ? (
        <Link
          href={href}
          className="-my-1 flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-2 -mx-2 outline-none transition-colors hover:bg-mint/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none"
        >
          {text}
          <ChevronRight
            aria-hidden
            className="size-4 shrink-0 text-ink-soft"
          />
        </Link>
      ) : (
        <div
          className={cn(
            "flex min-w-0 flex-1 items-center gap-3",
            step.done ? "min-h-8" : "min-h-11",
          )}
        >
          {text}
          {badge}
        </div>
      )}
    </li>
  );
}
