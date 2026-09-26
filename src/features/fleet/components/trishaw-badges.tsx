import { OctagonAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TrishawStatusName } from "../schemas";

const STATUS_TONE: Record<TrishawStatusName, string> = {
  active: "bg-mint-tint text-ink",
  maintenance: "bg-ink text-paper",
  retired: "border border-line bg-paper text-ink-soft",
};

export function TrishawStatusBadge({
  status,
  label,
  className,
}: {
  status: TrishawStatusName;
  label: string;
  className?: string;
}) {
  return (
    <Badge className={cn("font-normal", STATUS_TONE[status], className)}>
      {label}
    </Badge>
  );
}

export type DamageState = "grounded" | "damaged" | "none";

export const damageStateOf = (
  damages: { grounding: boolean }[],
): DamageState =>
  damages.some((damage) => damage.grounding)
    ? "grounded"
    : damages.length > 0
      ? "damaged"
      : "none";

export const DAMAGE_RANK: Record<DamageState, number> = {
  grounded: 0,
  damaged: 1,
  none: 2,
};

export function TrishawDamageBadge({
  state,
  label,
  count,
  className,
}: {
  state: DamageState;
  label: string;
  count: number;
  className?: string;
}) {
  if (state === "none") return null;
  const Icon = state === "grounded" ? OctagonAlert : TriangleAlert;
  return (
    <Badge
      className={cn(
        "gap-1 font-normal",
        state === "grounded" ? "bg-red text-white" : "bg-red-tint text-ink",
        className,
      )}
    >
      <Icon aria-hidden />
      {label}
      {count > 1 ? (
        <span className="tabular-nums opacity-80">· {count}</span>
      ) : null}
    </Badge>
  );
}
