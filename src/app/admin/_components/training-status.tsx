import { Badge } from "@/components/ui/badge";
import type { FamilyStatusName } from "@/features/training/requirements";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<FamilyStatusName, string> = {
  passed: "border-transparent bg-mint text-ink",
  exempt: "border-transparent bg-mint-tint text-ink",
  inProgress: "border-line text-ink",
  notStarted: "border-dashed border-line text-ink-soft",
};

export function TrainingStatusPill({
  status,
  label,
}: {
  status: FamilyStatusName;
  label: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("font-normal", STATUS_CLASS[status])}
    >
      {label}
    </Badge>
  );
}

export function ReadyBadge({
  ready,
  label,
}: {
  ready: boolean;
  label: string;
}) {
  return ready ? (
    <Badge className="border-transparent bg-mint-deep font-normal text-white">
      {label}
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="border-line font-normal text-ink-soft"
    >
      {label}
    </Badge>
  );
}

export function PercentBar({
  percent,
  label,
  className,
}: {
  percent: number;
  label: string;
  className?: string;
}) {
  const value = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <span
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label={label}
      className={cn(
        "block h-1.5 w-full overflow-hidden rounded-full bg-mint-tint",
        className,
      )}
    >
      <span
        className="block h-full origin-left rounded-full bg-mint transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{ transform: `scaleX(${value / 100})` }}
      />
    </span>
  );
}
