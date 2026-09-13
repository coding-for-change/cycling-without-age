"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowRight, Bike, Play, Users } from "lucide-react";
import { MintPillButton } from "../../_components/mint-pill-button";
import { haptics } from "@/lib/native/haptics";
import { Step, type StepProgress } from "../../_components/step";
import { finishPilotNextSteps } from "../actions";

type Strings = { title: string; steps: string[]; finish: string };

const ICONS = [Play, Users, Bike] as const;

export function PilotNextSteps({
  progress,
  strings,
}: {
  progress: StepProgress | null;
  strings: Strings;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const finish = () =>
    startTransition(async () => {
      haptics.success();
      const result = await finishPilotNextSteps();
      router.push(result.ok ? result.next : "/pilot", {
        transitionTypes: ["nav-forward"],
      });
    });

  return (
    <Step
      title={strings.title}
      progress={progress ?? undefined}
      action={
        <MintPillButton
          label={strings.finish}
          icon={ArrowRight}
          disabled={pending}
          onClick={finish}
        />
      }
    >
      <ol className="space-y-3">
        {strings.steps.map((line, index) => {
          const Icon = ICONS[index] ?? Bike;
          return (
            <li
              key={line}
              className="flex items-center gap-4 rounded-(--r-tile) border border-line bg-canvas p-4 shadow-soft"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-(--r-card) bg-mint-tint">
                <Icon
                  className="size-5 text-ink"
                  aria-hidden
                />
              </span>
              <span className="min-w-0 flex-1 text-sm leading-relaxed text-ink">
                {line}
              </span>
              <span
                aria-hidden
                className="shrink-0 text-sm font-bold tabular-nums text-ink-faint"
              >
                {index + 1}
              </span>
            </li>
          );
        })}
      </ol>
    </Step>
  );
}
