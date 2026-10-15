import { getEmailStrings } from "@/emails/strings";
import type { Locale } from "@/lib/i18n/locales";
import type { AnyKind } from "./types";
import { careDecided, careInvited, careRequested } from "./care";
import { chapterMemberJoined } from "./chapter-member-joined";
import { countryAdminAppointed, countryAdminRemoved } from "./country-admin";
import { memberInvited } from "./member-invited";
import { memberRoleChanged } from "./member-role-changed";
import { pilotApplicationDecided } from "./pilot-application-decided";
import { pilotApplicationSubmitted } from "./pilot-application-submitted";
import { poolAccessDecided, poolAccessRequested } from "./pool-access";
import {
  rideBookingCancelled,
  rideBookingConfirmed,
  rideCancelled,
  ridePilotAssigned,
  rideRescheduled,
} from "./rides";
import {
  riderHandedOver,
  rideRequestDeclined,
  rideRequestScheduled,
  rideRequestSubmitted,
  rideRequestWithdrawn,
} from "./ride-requests";
import {
  rideAnnounced,
  rideOpened,
  ridePilotWithdrew,
  rideUnderstaffed,
} from "./staffing";
import { trishawDamageReported } from "./trishaw-damage-reported";
import { userOnboarded } from "./user-onboarded";

export const kinds: AnyKind[] = [
  careDecided,
  careInvited,
  careRequested,
  chapterMemberJoined,
  countryAdminAppointed,
  countryAdminRemoved,
  memberInvited,
  memberRoleChanged,
  pilotApplicationDecided,
  pilotApplicationSubmitted,
  poolAccessDecided,
  poolAccessRequested,
  rideAnnounced,
  rideBookingCancelled,
  rideBookingConfirmed,
  rideCancelled,
  rideOpened,
  ridePilotAssigned,
  ridePilotWithdrew,
  rideRequestDeclined,
  rideRequestScheduled,
  rideRequestSubmitted,
  rideRequestWithdrawn,
  rideRescheduled,
  riderHandedOver,
  rideUnderstaffed,
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

async function paramsOf(kind: AnyKind, payload: unknown) {
  const params = kind.payload.parse(payload);
  return (await kind.hydrate?.(params)) ?? params;
}

export async function renderMessage(
  kind: AnyKind,
  payload: unknown,
  locale: Locale,
) {
  return kind.message(
    await paramsOf(kind, payload),
    getEmailStrings(locale),
    locale,
  );
}

/** The message and the calendar files that go with it, for one mail. */
export async function renderMail(
  kind: AnyKind,
  payload: unknown,
  locale: Locale,
) {
  const params = await paramsOf(kind, payload);
  const strings = getEmailStrings(locale);
  return {
    message: kind.message(params, strings, locale),
    attachments: kind.attachments?.(params, strings, locale) ?? [],
  };
}
