import Link from "next/link";
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
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import type {
  ChecklistStep,
  ChecklistStepKey,
  ManagedRidersSummary,
} from "../checklist";
import { subjectSlug } from "../schemas";
import { EnablePushButton } from "./enable-push-button";

export type SetupStrings = Dictionary["setupChecklist"];

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

export type StepContext = {
  managedRiders: ManagedRidersSummary;
  aboutYou: boolean;
  trainingRequired: boolean;
  home: string;
  strings: SetupStrings;
  language: string;
};

export const stepHref = (key: ChecklistStepKey, context: StepContext) => {
  const { managedRiders: riders, home, trainingRequired } = context;
  if (key === "managedRiders" && riders.missing === 1 && riders.focus)
    return `${home}/profile/${subjectSlug(riders.focus.ref)}`;
  if (PROFILE_STEPS.has(key)) return `${home}/profile`;
  if (trainingRequired && (key === "training" || key === "inPersonTraining"))
    return "/pilot/training";
  return null;
};

const stepHint = (key: ChecklistStepKey, context: StepContext) => {
  const { strings, aboutYou } = context;
  if (aboutYou && ABOUT_YOU_STEPS.has(key)) return strings.aboutYou;
  return key in strings.hints
    ? strings.hints[key as keyof SetupStrings["hints"]]
    : null;
};

export const stepLabel = (key: ChecklistStepKey, context: StepContext) =>
  key === "managedRiders"
    ? formatMessage(
        context.strings.steps.managedRiders,
        {
          count: context.managedRiders.missing || context.managedRiders.total,
          name: context.managedRiders.focus?.name ?? "",
        },
        context.language,
      )
    : context.strings.steps[key];

export function SetupStepList({
  steps,
  context,
  onNavigate,
}: {
  steps: ChecklistStep[];
  context: StepContext;
  onNavigate?: () => void;
}) {
  const done = steps.filter((step) => step.done);
  const open = steps.filter((step) => !step.done);

  return (
    <div className="grid gap-3">
      {open.length > 0 ? (
        <ul className="grid gap-1.25">
          {open.map((step) => (
            <StepRow
              key={step.key}
              step={step}
              label={stepLabel(step.key, context)}
              hint={
                step.waiting
                  ? context.strings.waiting
                  : stepHint(step.key, context)
              }
              href={stepHref(step.key, context)}
              strings={context.strings}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      ) : null}

      {done.length > 0 ? (
        <ul
          className={cn(
            "grid gap-1",
            open.length > 0 && "border-t border-line pt-3",
          )}
        >
          {done.map((step) => (
            <StepRow
              key={step.key}
              step={step}
              label={stepLabel(step.key, context)}
              hint={null}
              href={null}
              strings={context.strings}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function StepRow({
  step,
  label,
  hint,
  href,
  strings,
  onNavigate,
}: {
  step: ChecklistStep;
  label: string;
  hint: string | null;
  href: string | null;
  strings: SetupStrings;
  onNavigate?: () => void;
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
            : "bg-canvas-deep text-ink",
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
          transitionTypes={["push"]}
          onClick={onNavigate}
          className="-mx-2 flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1 outline-none transition-colors hover:bg-mint-tint focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none"
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
