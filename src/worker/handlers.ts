import type { Envelope, EventType } from "@/lib/events/catalog";
import { notify } from "@/use-cases/notifications/notify";
import { recordActivity } from "./listeners/record-activity";

export type Listener<K extends EventType = EventType> = (
  envelope: Envelope<K>,
) => Promise<void>;

// `Listener<K> | Listener`: a listener may narrow to one event or take them
// all. `EventOf` is a conditional type, which TypeScript measures as invariant,
// so the generic form does not fit `Listener<K>` on its own.
type Registry = { [K in EventType]: Record<string, Listener<K> | Listener> };

export const handlers: Registry = {
  "pilotApplication.decided": { notify, recordActivity },
  "pilotApplication.submitted": { notify, recordActivity },
  "member.invited": { notify, recordActivity },
  "member.roleChanged": { notify, recordActivity },
  "countryAdmin.appointed": { notify, recordActivity },
  "countryAdmin.removed": { notify, recordActivity },
  "user.onboarded": { notify },
  "chapter.memberJoined": { notify },
};
