import { getEmailStrings } from "@/emails/strings";
import type { Locale } from "@/lib/i18n/locales";
import type { AnyKind } from "./types";
import { chapterMemberJoined } from "./chapter-member-joined";
import { countryAdminAppointed, countryAdminRemoved } from "./country-admin";
import { memberInvited } from "./member-invited";
import { memberRoleChanged } from "./member-role-changed";
import { pilotApplicationDecided } from "./pilot-application-decided";
import { pilotApplicationSubmitted } from "./pilot-application-submitted";
import { poolAccessDecided, poolAccessRequested } from "./pool-access";
import { trishawDamageReported } from "./trishaw-damage-reported";
import { userOnboarded } from "./user-onboarded";

export const kinds: AnyKind[] = [
  chapterMemberJoined,
  countryAdminAppointed,
  countryAdminRemoved,
  memberInvited,
  memberRoleChanged,
  pilotApplicationDecided,
  pilotApplicationSubmitted,
  poolAccessDecided,
  poolAccessRequested,
  trishawDamageReported,
  userOnboarded,
];

const byEvent = new Map(kinds.map((kind) => [kind.event as string, kind]));

export const findKind = (eventType: string) => byEvent.get(eventType);

export function kindOf(eventType: string): AnyKind {
  const kind = findKind(eventType);
  if (!kind) throw new Error(`[notifications] no kind for ${eventType}`);
  return kind;
}

export const renderMessage = (
  kind: AnyKind,
  payload: unknown,
  locale: Locale,
) => kind.message(kind.payload.parse(payload), getEmailStrings(locale), locale);
