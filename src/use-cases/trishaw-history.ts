import { fleet, type DamageRow, type LogRow } from "@/features/fleet";
import { rides, type TrishawRideRow } from "@/features/rides";

export type TrishawHistoryItem =
  | { kind: "ride"; at: Date; ride: TrishawRideRow }
  | { kind: "damage"; at: Date; damage: DamageRow }
  | { kind: "log"; at: Date; entry: HistoryLogRow };

type DamageLogType = "damageReported" | "damageCleared";
type HistoryLogRow = LogRow & { type: Exclude<LogRow["type"], DamageLogType> };

const SHOWN_IN_DAMAGE: ReadonlySet<LogRow["type"]> = new Set<DamageLogType>([
  "damageReported",
  "damageCleared",
]);

const isHistoryLog = (entry: LogRow): entry is HistoryLogRow =>
  !SHOWN_IN_DAMAGE.has(entry.type);

export async function trishawHistory(
  trishawId: string,
  now = new Date(),
): Promise<TrishawHistoryItem[]> {
  const [trishawRides, damages, log] = await Promise.all([
    rides.listRidesOfTrishaw(trishawId),
    fleet.listDamages(trishawId),
    fleet.listLog(trishawId),
  ]);

  return [
    ...trishawRides
      .filter((ride) => ride.startsAt <= now)
      .map((ride) => ({ kind: "ride" as const, at: ride.startsAt, ride })),
    ...damages.map((damage) => ({
      kind: "damage" as const,
      at: damage.reportedAt,
      damage,
    })),
    ...log
      .filter(isHistoryLog)
      .map((entry) => ({ kind: "log" as const, at: entry.createdAt, entry })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
}
