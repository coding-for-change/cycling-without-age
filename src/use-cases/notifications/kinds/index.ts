import type { AnyKind } from "./types";
import { chapterMemberJoined } from "./chapter-member-joined";
import { countryAdminAppointed } from "./country-admin-appointed";
import { countryAdminRemoved } from "./country-admin-removed";
import { memberInvited } from "./member-invited";
import { memberRoleChanged } from "./member-role-changed";
import { pilotApplicationDecided } from "./pilot-application-decided";
import { pilotApplicationSubmitted } from "./pilot-application-submitted";
import { userOnboarded } from "./user-onboarded";

export const kinds: AnyKind[] = [
  chapterMemberJoined,
  countryAdminAppointed,
  countryAdminRemoved,
  memberInvited,
  memberRoleChanged,
  pilotApplicationDecided,
  pilotApplicationSubmitted,
  userOnboarded,
];

const byEvent = new Map(kinds.map((kind) => [kind.event as string, kind]));

export function kindOf(eventType: string): AnyKind {
  const kind = byEvent.get(eventType);
  if (!kind) throw new Error(`[notifications] no kind for ${eventType}`);
  return kind;
}
