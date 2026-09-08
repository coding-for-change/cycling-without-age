import type { Envelope, EventType } from "@/lib/events/catalog";
import { notify } from "@/use-cases/notifications/notify";
import { recordActivity } from "./listeners/record-activity";

export type Listener<K extends EventType> = (
  envelope: Envelope<K>,
) => Promise<void>;

type Registry = { [K in EventType]: Record<string, Listener<K>> };

export const handlers: Registry = {
  "pilotApplication.decided": { notify, recordActivity },
};
