import { DomainError } from "@/lib/domain-error";
import { transaction } from "@/lib/events";
import type { OnboardingRole } from "@/lib/onboarding";
import {
  consentInput,
  homeInput,
  notificationPreferences as notificationPreferencesSchema,
  ownDetailsPatch,
  personalDetailsInput,
  residence as residenceSchema,
} from "./schemas";
import type {
  ConsentInput,
  HomeInput,
  NotificationPreferences,
  OwnDetailsPatchInput,
  PersonalDetailsInput,
  Residence,
} from "./schemas";
import {
  findProfile,
  findUserIdByEmail,
  stampOnboarded,
  updateProfile,
} from "./services/profile";

export type Profile = NonNullable<Awaited<ReturnType<typeof findProfile>>>;

export const getProfile = (userId: string) => findProfile(userId);

export const getUserIdByEmail = async (email: string) =>
  (await findUserIdByEmail(email.trim().toLowerCase()))?.id ?? null;

export const setLocale = (userId: string, locale: string) =>
  updateProfile(userId, { locale });

/**
 * The care-home path clears any address on purpose: the chapter's own position is
 * the pickup point, and a stale home address left behind would quietly become the
 * one a ride is planned from.
 */
export async function setResidence(
  userId: string,
  residence: Residence,
  home?: HomeInput,
) {
  const kind = residenceSchema.parse(residence);
  if (kind === "careHome") {
    return updateProfile(userId, {
      residence: "careHome",
      address: null,
      latitude: null,
      longitude: null,
    });
  }
  const { address, latitude, longitude } = homeInput.parse(home);
  return updateProfile(userId, {
    residence: "home",
    address,
    latitude,
    longitude,
  });
}

/**
 * Consent is stamped, never unstamped: withdrawing it is an account deletion,
 * which is a different flow with different obligations.
 *
 * The timestamps record when they FIRST agreed and are not moved by a later
 * visit — someone stepping back through the flow to change their notification
 * preference has not re-consented, and a consent date that drifts forward is
 * worse than useless in a data-protection request. The preferences themselves
 * are a live setting and do follow the latest answer.
 */
export async function recordConsent(userId: string, input: ConsentInput) {
  const { safety, notifications, data } = consentInput.parse(input);
  if (!data) throw new DomainError("consentRequired");

  const existing = await findProfile(userId);
  const now = new Date();
  return updateProfile(userId, {
    consentDataAt: existing?.consentDataAt ?? now,
    ...(safety ? { consentSafetyAt: existing?.consentSafetyAt ?? now } : {}),
    notifyEmail: notifications,
    notifyPush: notifications,
  });
}

/** True the first time only, so the welcome lands once however often the last
 *  onboarding step is submitted. */
export function completeOnboarding(
  userId: string,
  { chapterId, role }: { chapterId: string | null; role: OnboardingRole },
) {
  return transaction(async (tx, emit) => {
    const { count } = await stampOnboarded(userId, tx);
    if (count !== 1) return false;
    await emit({ type: "user.onboarded", userId, chapterId, role });
    return true;
  });
}

export function setPersonalDetails(
  userId: string,
  input: PersonalDetailsInput,
) {
  const { firstName, lastName, birthDate, gender } =
    personalDetailsInput.parse(input);
  // `name` is BetterAuth's own column and what every member list renders, so it
  // is kept in step rather than left as whatever the OAuth provider supplied.
  return updateProfile(userId, {
    name: `${firstName} ${lastName}`,
    birthDate,
    gender,
  });
}

/**
 * Self-service edits arrive one field at a time, so only the keys the patch
 * actually carries are written — spreading the rest as `undefined` would be a
 * Prisma no-op today and an accidental blanking the day a field becomes nullable.
 */
export async function updateOwnDetails(
  userId: string,
  patch: OwnDetailsPatchInput,
) {
  const { name, birthDate, gender } = ownDetailsPatch.parse(patch);
  return updateProfile(userId, {
    ...(name === undefined ? {} : { name }),
    ...(birthDate === undefined ? {} : { birthDate }),
    ...(gender === undefined ? {} : { gender }),
  });
}

export async function setNotificationPreferences(
  userId: string,
  prefs: NotificationPreferences,
) {
  const { push, email } = notificationPreferencesSchema.parse(prefs);
  return updateProfile(userId, {
    ...(push === undefined ? {} : { notifyPush: push }),
    ...(email === undefined ? {} : { notifyEmail: email }),
  });
}

export const markManagesOthers = (
  userId: string,
  helperRelationship?: string | null,
) => updateProfile(userId, { managesOthers: true, helperRelationship });

export const markPasskeyPrompted = (userId: string) =>
  updateProfile(userId, { passkeyPromptedAt: new Date() });

export const markPilotNextStepsSeen = (userId: string) =>
  updateProfile(userId, { pilotNextStepsSeenAt: new Date() });
