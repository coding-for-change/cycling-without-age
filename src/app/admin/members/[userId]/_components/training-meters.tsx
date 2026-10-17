import { Check, ShieldCheck, type LucideIcon } from "lucide-react";
import type { FamilyStatusName } from "@/features/training/requirements";
import { cn } from "@/lib/utils";

const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

const SWEEP = `@keyframes training-gauge-sweep{from{stroke-dashoffset:100}}@keyframes training-needle-sweep{from{transform:rotate(-90deg)}}`;

export function TrainingGauge({
  percent,
  label,
}: {
  percent: number;
  label: string;
}) {
  const value = clamp(percent);
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 100 56"
      className="h-auto w-full max-w-28"
    >
      <style
        href="training-gauge-sweep"
        precedence="default"
      >
        {SWEEP}
      </style>
      <path
        d="M 8 50 A 42 42 0 0 1 92 50"
        pathLength={100}
        fill="none"
        strokeWidth={8}
        strokeLinecap="round"
        className="stroke-mint-tint"
      />
      {value > 0 ? (
        <path
          d="M 8 50 A 42 42 0 0 1 92 50"
          pathLength={100}
          fill="none"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray="100 100"
          strokeDashoffset={100 - value}
          className="stroke-mint motion-safe:animate-[training-gauge-sweep_800ms_cubic-bezier(0.22,1,0.36,1)]"
        />
      ) : null}
      <g
        style={{
          transform: `rotate(${value * 1.8 - 90}deg)`,
          transformOrigin: "50px 50px",
        }}
        className="motion-safe:animate-[training-needle-sweep_800ms_cubic-bezier(0.22,1,0.36,1)]"
      >
        <line
          x1={50}
          y1={50}
          x2={50}
          y2={22}
          strokeWidth={3}
          strokeLinecap="round"
          className="stroke-ink"
        />
      </g>
      <circle
        cx={50}
        cy={50}
        r={4.5}
        className="fill-ink"
      />
    </svg>
  );
}

export function ProgressRing({
  status,
  percent,
}: {
  status: FamilyStatusName;
  percent: number;
}) {
  if (status === "passed")
    return (
      <span
        aria-hidden
        className="grid size-5 shrink-0 place-items-center rounded-full bg-mint text-ink"
      >
        <Check
          className="size-3"
          strokeWidth={3}
        />
      </span>
    );
  if (status === "exempt")
    return (
      <span
        aria-hidden
        className="grid size-5 shrink-0 place-items-center rounded-full bg-mint-tint text-mint-ink"
      >
        <ShieldCheck className="size-3" />
      </span>
    );
  const value = clamp(percent);
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="size-5 shrink-0 -rotate-90"
    >
      <circle
        cx={10}
        cy={10}
        r={8}
        fill="none"
        strokeWidth={2.5}
        strokeDasharray={status === "notStarted" ? "2 2.2" : undefined}
        pathLength={status === "notStarted" ? undefined : 100}
        className="stroke-line"
      />
      {value > 0 ? (
        <circle
          cx={10}
          cy={10}
          r={8}
          fill="none"
          strokeWidth={2.5}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${value} 100`}
          className="stroke-mint transition-[stroke-dasharray] duration-300 motion-reduce:transition-none"
        />
      ) : null}
    </svg>
  );
}

export function StepDot({
  icon: Icon,
  done,
}: {
  icon: LucideIcon;
  done: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-full",
        done ? "bg-mint-deep text-white" : "border border-line text-ink-soft",
      )}
    >
      <Icon className="size-3" />
    </span>
  );
}
