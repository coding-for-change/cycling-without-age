import {
  consentInput,
  homeInput,
  personalDetailsInput,
  residence as residenceSchema,
} from "./schemas";
import type {
  ConsentInput,
  HomeInput,
  PersonalDetailsInput,
  Residence,
} from "./schemas";
import { findProfile, updateProfile } from "./services/profile";

export type Profile = NonNullable<Awaited<ReturnType<typeof findProfile>>>;

export const getProfile = (userId: string) => findProfile(userId);

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
  if (!data) throw new Error("Data-processing consent is required");

  const existing = await findProfile(userId);
  const now = new Date();
  return updateProfile(userId, {
    consentDataAt: existing?.consentDataAt ?? now,
    ...(safety ? { consentSafetyAt: existing?.consentSafetyAt ?? now } : {}),
    notifyEmail: notifications,
    notifyPush: notifications,
  });
}

/** True the first time only, so the welcome mail survives a re-submitted step. */
export async function claimWelcomeEmail(userId: string) {
  const existing = await findProfile(userId);
  if (existing?.welcomeEmailSentAt) return false;
  await updateProfile(userId, { welcomeEmailSentAt: new Date() });
  return true;
}

/** Undoes `claimWelcomeEmail` after a failed send, so the next attempt may retry. */
export const releaseWelcomeEmail = (userId: string) =>
  updateProfile(userId, { welcomeEmailSentAt: null });

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

export const markManagesOthers = (userId: string) =>
  updateProfile(userId, { managesOthers: true });

export const markPasskeyPrompted = (userId: string) =>
  updateProfile(userId, { passkeyPromptedAt: new Date() });

export const markPilotNextStepsSeen = (userId: string) =>
  updateProfile(userId, { pilotNextStepsSeenAt: new Date() });
