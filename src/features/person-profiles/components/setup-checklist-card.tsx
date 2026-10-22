"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
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
  Hourglass,
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
import { dismissSetupAction } from "../actions";
import type {
  ChecklistStep,
  ChecklistStepKey,
  ManagedRidersSummary,
} from "../checklist";
import { subjectSlug } from "../schemas";
import { EnablePushButton } from "./enable-push-button";

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
  training: GraduationCap,
  inPersonTraining: Users,
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

const ABOUT_YOU_STEPS = new Set<ChecklistStepKey>(["photo", "bio"]);

const hrefOf = (
  key: ChecklistStepKey,
  home: string,
  riders: ManagedRidersSummary,
  trainingRequired: boolean,
) => {
  if (key === "managedRiders" && riders.missing === 1 && riders.focus)
    return `${home}/profile/${subjectSlug(riders.focus.ref)}`;
  if (PROFILE_STEPS.has(key)) return `${home}/profile`;
  if (trainingRequired && (key === "training" || key === "inPersonTraining"))
    return "/pilot/training";
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
  trainingRequired,
  home,
  strings,
  errors,
  language,
}: {
  steps: ChecklistStep[];
  managedRiders: ManagedRidersSummary;
  aboutYou: boolean;
  trainingRequired: boolean;
  home: string;
  strings: Strings;
  errors: Errors;
  language: string;
}) {
  const [hidden, setHidden] = useState(false);
  const [dismissing, startDismiss] = useTransition();

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

  const done = steps.filter((step) => step.done);
  const open = steps.filter((step) => !step.done);
  const percent = Math.round((done.length / steps.length) * 100);

  const fail = (error: keyof Errors | string) => {
    haptics.error();
    toast.error(errors[error as keyof Errors] ?? errors.generic);
  };

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
              { done: done.length, total: steps.length },
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
        aria-valuemax={steps.length}
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
            hint={
              step.waiting
                ? strings.waiting
                : hintOf(step.key, strings, aboutYou)
            }
            href={hrefOf(step.key, home, managedRiders, trainingRequired)}
            strings={strings}
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
}: {
  step: ChecklistStep;
  label: string;
  hint: string | null;
  href: string | null;
  strings: Strings;
}) {
  const Icon = ICONS[step.key];
  const waiting = !step.done && step.waiting === true;
  const marker = (
    <span
      aria-hidden
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-full",
        step.done
          ? "bg-mint-deep text-white"
          : waiting
            ? "border border-dashed border-ink-faint bg-canvas text-ink-soft"
            : "bg-canvas text-ink",
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
      {hint ? (
        <span className="flex items-center gap-1 text-xs text-ink-soft">
          {waiting ? (
            <Hourglass
              aria-hidden
              className="size-3 shrink-0"
            />
          ) : null}
          {hint}
        </span>
      ) : null}
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
          className="-mx-2 flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1 outline-none transition-colors hover:bg-mint/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none"
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
          {step.key === "push" && !step.done ? (
            <EnablePushButton
              label={strings.enable}
              deniedMessage={strings.denied}
            />
          ) : null}
        </div>
      )}
    </li>
  );
}
