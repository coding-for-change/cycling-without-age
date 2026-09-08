import type { AnyKind } from "./types";
import { pilotApplicationDecided } from "./pilot-application-decided";

export const kinds: AnyKind[] = [pilotApplicationDecided];

const byEvent = new Map(kinds.map((kind) => [kind.event as string, kind]));

export function kindOf(eventType: string): AnyKind {
  const kind = byEvent.get(eventType);
  if (!kind) throw new Error(`[notifications] no kind for ${eventType}`);
  return kind;
}
