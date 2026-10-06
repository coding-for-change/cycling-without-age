import { trishawSummary } from "@/components/trishaw-summary";
import { damageStateOf } from "@/features/fleet/components/trishaw-badges";
import type { Locale } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";

export type TrishawOption = {
  id: string;
  name: string;
  photoFileId: string | null;
  model: string | null;
  seats: string | null;
  wheelchair: boolean;
  location: string;
  isPool: boolean;
  allocated: boolean;
  blocked: string | null;
  warning: string | null;
  damaged: boolean;
};

type Choice = Parameters<typeof trishawSummary>[0] & {
  status: "active" | "maintenance" | "retired";
  damages: { grounding: boolean }[];
};

/**
 * One row per trishaw the chapter can reach. A row that is not ready, or is
 * already held for the window, cannot be picked; one that is already on the
 * ride stays picked and says why it is a problem.
 */
export function trishawOptions(
  choices: { trishaws: Choice[]; busy: Record<string, boolean> },
  allocatedIds: ReadonlySet<string>,
  dict: Dictionary,
  words: Locale,
): TrishawOption[] {
  const { common, allocation } = dict.fleet;
  return choices.trishaws.map((trishaw) => {
    const allocated = allocatedIds.has(trishaw.id);
    const busy = choices.busy[trishaw.id] === true;
    const damage = damageStateOf(trishaw.damages);
    const ready = trishaw.status === "active" && damage !== "grounded";
    const notReady =
      trishaw.status === "active"
        ? common.grounded
        : common.statuses[trishaw.status];
    return {
      ...trishawSummary(trishaw, dict, words),
      allocated,
      blocked: !ready ? notReady : busy ? allocation.booked : null,
      warning: allocated
        ? !ready
          ? `${notReady} · ${allocation.kept}`
          : busy
            ? allocation.booked
            : null
        : null,
      damaged: damage === "damaged",
    };
  });
}
