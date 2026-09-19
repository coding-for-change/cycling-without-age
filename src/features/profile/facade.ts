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
  findProfiles,
  findProfilesByName,
  findUserIdByEmail,
  findUserIdByPhone,
  stampOnboarded,
  updateProfile,
} from "./services/profile";

export type Profile = NonNullable<Awaited<ReturnType<typeof findProfile>>>;

export type ProfileSummary = Awaited<ReturnType<typeof findProfiles>>[number];

export const getProfile = (userId: string) => findProfile(userId);

export const getProfiles = async (
  userIds: string[],
): Promise<ProfileSummary[]> => {
  const unique = [...new Set(userIds)];
  return unique.length === 0 ? [] : findProfiles(unique);
};

export const searchProfilesByName = (
  query: string,
  opts: { limit: number; excludeUserId: string },
) => findProfilesByName(query.trim(), opts.limit, opts.excludeUserId);

export const getUserIdByEmail = async (email: string) =>
  (await findUserIdByEmail(email.trim().toLowerCase()))?.id ?? null;

export const getUserIdByPhone = async (phone: string) =>
  (await findUserIdByPhone(phone.trim()))?.id ?? null;

export const setLocale = (userId: string, locale: string) =>
  updateProfile(userId, { locale });

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
  return updateProfile(userId, {
    name: `${firstName} ${lastName}`,
    birthDate,
    gender,
  });
}

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
  const { push, email, chatPush, chatEmail } =
    notificationPreferencesSchema.parse(prefs);
  return updateProfile(userId, {
    ...(push === undefined ? {} : { notifyPush: push }),
    ...(email === undefined ? {} : { notifyEmail: email }),
    ...(chatPush === undefined ? {} : { notifyChatPush: chatPush }),
    ...(chatEmail === undefined ? {} : { notifyChatEmail: chatEmail }),
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
