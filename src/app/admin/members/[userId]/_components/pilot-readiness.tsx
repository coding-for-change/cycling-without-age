"use client";

import { useTransition } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notify, type NotifyLabels } from "@/components/action-feedback";
import type { PilotStep } from "@/features/person-profiles";
import { cn } from "@/lib/utils";
import { confirmPilotStepAction, revokePilotStepAction } from "../../actions";

export type ReadinessStep = {
  key: PilotStep | "firstRide";
  done: boolean;
  confirmed: boolean;
};

export type ReadinessLabels = {
  confirm: string;
  confirmed: string;
  revoke: string;
  revoked: string;
  ticked: string;
  open: string;
  rode: string;
  done: string;
  steps: Record<ReadinessStep["key"], string>;
  errors: NotifyLabels["errors"];
};

export function PilotReadiness({
  userId,
  steps,
  canConfirm,
  labels,
}: {
  userId: string;
  steps: ReadinessStep[];
  canConfirm: boolean;
  labels: ReadinessLabels;
}) {
  return (
    <ul className="grid gap-3">
      {steps.map((step) => (
        <ReadinessRow
          key={step.key}
          userId={userId}
          step={step}
          canConfirm={canConfirm}
          labels={labels}
        />
      ))}
    </ul>
  );
}

function ReadinessRow({
  userId,
  step,
  canConfirm,
  labels,
}: {
  userId: string;
  step: ReadinessStep;
  canConfirm: boolean;
  labels: ReadinessLabels;
}) {
  const [pending, startTransition] = useTransition();
  const automatic = step.key === "firstRide";

  const confirm = (key: PilotStep) =>
    startTransition(async () => {
      const result = await confirmPilotStepAction({ userId, step: key });
      notify(result, { done: labels.done, errors: labels.errors });
    });

  const revoke = (key: PilotStep) =>
    startTransition(async () => {
      const result = await revokePilotStepAction({ userId, step: key });
      notify(result, { done: labels.revoked, errors: labels.errors });
    });

  const status = automatic
    ? step.done
      ? labels.rode
      : labels.open
    : step.confirmed
      ? labels.confirmed
      : step.done
        ? labels.ticked
        : labels.open;

  const settled = automatic ? step.done : step.confirmed;

  return (
    <li className="flex items-center gap-2 text-2sm">
      <span
        aria-hidden
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full",
          settled
            ? "bg-mint-deep text-white"
            : step.done
              ? "bg-mint text-ink"
              : "border border-ink/30",
        )}
      >
        {settled ? (
          automatic ? (
            <Check className="size-3" />
          ) : (
            <ShieldCheck className="size-3" />
          )
        ) : step.done ? (
          <Check className="size-3" />
        ) : null}
      </span>
      <span className="grid min-w-0 flex-1">
        <span className="font-medium">{labels.steps[step.key]}</span>
        {status ? <span className="text-ink-soft">{status}</span> : null}
      </span>
      {!automatic && !step.confirmed && canConfirm ? (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => confirm(step.key as PilotStep)}
          className="shrink-0 border-line"
        >
          {labels.confirm}
        </Button>
      ) : null}
      {!automatic && step.confirmed && canConfirm ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => revoke(step.key as PilotStep)}
          className="shrink-0 text-ink-soft"
        >
          {labels.revoke}
        </Button>
      ) : null}
    </li>
  );
}
