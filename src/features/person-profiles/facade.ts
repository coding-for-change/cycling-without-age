import { DomainError } from "@/lib/domain-error";
import { commitUpload, deleteObject, requestUpload } from "@/lib/storage";
import {
  accessibilityInput,
  accessibilityTagsInput,
  customInterestsInput,
  interestsInput,
  profilePatch,
  promptsInput,
  subjectSlug,
} from "./schemas";
import type {
  AccessibilityInput,
  AccessibilityTag,
  InterestKey,
  PilotStep,
  ProfilePatchInput,
  PromptAnswer,
  SubjectRef,
} from "./schemas";
import {
  clearPilotStepConfirmation,
  deletePilotStep,
  deleteProfileOfPassenger,
  deleteStoredFile,
  deleteStoredFiles,
  findPhotoFilesOf,
  findPhotoOwner,
  findPilotSteps,
  findProfileBySubject,
  findProfilesBySubjects,
  findStoredFileKey,
  moveProfileToUser,
  upsertPilotStep,
  upsertProfile,
  type ProfileRow,
} from "./services/profiles";

export type PersonProfile = {
  bio: string | null;
  interests: InterestKey[];
  customInterests: string[];
  prompts: PromptAnswer[];
  hideAge: boolean;
  accessibilityTags: AccessibilityTag[];
  accessibilityNone: boolean;
  healthConsent: boolean;
  photoFileId: string | null;
  setupDismissed: boolean;
};

export type PublicProfile = {
  bio: string | null;
  interests: InterestKey[];
  customInterests: string[];
  prompts: PromptAnswer[];
  age: number | null;
  accessibilityTags: AccessibilityTag[];
  photoFileId: string | null;
};

const listOr = <T>(
  schema: { safeParse: (v: unknown) => { success: boolean; data?: T } },
  value: unknown,
  fallback: T,
): T => {
  const parsed = schema.safeParse(value);
  return parsed.success ? (parsed.data as T) : fallback;
};

export const EMPTY_PROFILE: PersonProfile = {
  bio: null,
  interests: [],
  customInterests: [],
  prompts: [],
  hideAge: false,
  accessibilityTags: [],
  accessibilityNone: false,
  healthConsent: false,
  photoFileId: null,
  setupDismissed: false,
};

function toProfile(row: ProfileRow | null): PersonProfile {
  if (!row) return EMPTY_PROFILE;
  const healthConsent = row.healthConsentAt !== null;
  return {
    bio: row.bio,
    interests: listOr(interestsInput, row.interests, []),
    customInterests: listOr(customInterestsInput, row.customInterests, []),
    prompts: listOr(promptsInput, row.prompts, []),
    hideAge: row.hideAge,
    accessibilityTags: healthConsent
      ? listOr(accessibilityTagsInput, row.accessibilityTags, [])
      : [],
    accessibilityNone: row.accessibilityNone,
    healthConsent,
    photoFileId: row.photoFileId,
    setupDismissed: row.setupDismissedAt !== null,
  };
}

export function ageOn(birthDate: Date, now: Date) {
  const years = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < birthDate.getUTCMonth() ||
    (now.getUTCMonth() === birthDate.getUTCMonth() &&
      now.getUTCDate() < birthDate.getUTCDate());
  return beforeBirthday ? years - 1 : years;
}

export function toPublicProfile(
  profile: PersonProfile,
  birthDate: Date | null,
  now = new Date(),
): PublicProfile {
  return {
    bio: profile.bio,
    interests: profile.interests,
    customInterests: profile.customInterests,
    prompts: profile.prompts,
    age: birthDate && !profile.hideAge ? ageOn(birthDate, now) : null,
    accessibilityTags: profile.healthConsent ? profile.accessibilityTags : [],
    photoFileId: profile.photoFileId,
  };
}

export const getProfile = async (subject: SubjectRef) =>
  toProfile(await findProfileBySubject(subject));

export async function getProfiles(subjects: SubjectRef[]) {
  const userIds = subjects.filter((s) => s.kind === "user").map((s) => s.id);
  const passengerIds = subjects
    .filter((s) => s.kind === "passenger")
    .map((s) => s.id);
  const rows =
    subjects.length === 0
      ? []
      : await findProfilesBySubjects(userIds, passengerIds);
  const bySlug = new Map<string, PersonProfile>();
  for (const row of rows) {
    const subject: SubjectRef = row.userId
      ? { kind: "user", id: row.userId }
      : { kind: "passenger", id: row.passengerId as string };
    bySlug.set(subjectSlug(subject), toProfile(row));
  }
  return bySlug;
}

export async function photoFileIdsOf(subjects: SubjectRef[]) {
  const profiles = await getProfiles(subjects);
  const photos = new Map<string, string>();
  for (const [slug, profile] of profiles)
    if (profile.photoFileId) photos.set(slug, profile.photoFileId);
  return photos;
}

export async function updateProfile(
  subject: SubjectRef,
  patch: ProfilePatchInput,
) {
  const { bio, interests, customInterests, prompts, hideAge } =
    profilePatch.parse(patch);
  return toProfile(
    await upsertProfile(subject, {
      ...(bio === undefined ? {} : { bio }),
      ...(interests === undefined ? {} : { interests }),
      ...(customInterests === undefined ? {} : { customInterests }),
      ...(prompts === undefined ? {} : { prompts }),
      ...(hideAge === undefined ? {} : { hideAge }),
    }),
  );
}

export async function setAccessibility(
  subject: SubjectRef,
  input: AccessibilityInput,
) {
  const parsed = accessibilityInput.parse(input);
  if (parsed.none)
    return toProfile(
      await upsertProfile(subject, {
        accessibilityTags: [],
        accessibilityNone: true,
      }),
    );

  const current = await findProfileBySubject(subject);
  if (!current?.healthConsentAt) throw new DomainError("healthConsentRequired");
  return toProfile(
    await upsertProfile(subject, {
      accessibilityTags: parsed.tags,
      accessibilityNone: false,
    }),
  );
}

export async function grantHealthConsent(
  subject: SubjectRef,
  byUserId: string,
) {
  const current = await findProfileBySubject(subject);
  return toProfile(
    await upsertProfile(subject, {
      healthConsentAt: current?.healthConsentAt ?? new Date(),
      healthConsentByUserId: byUserId,
    }),
  );
}

export const withdrawHealthConsent = async (subject: SubjectRef) =>
  toProfile(
    await upsertProfile(subject, {
      healthConsentAt: null,
      healthConsentByUserId: null,
      accessibilityTags: [],
      accessibilityNone: false,
    }),
  );

export const requestPhotoUpload = (
  uploaderUserId: string,
  mime: string,
  size: number,
) => requestUpload(uploaderUserId, "profilePhoto", { mime, size });

async function dropPhotoFile(fileId: string) {
  const file = await findStoredFileKey(fileId);
  await deleteStoredFile(fileId);
  if (file) await deleteObject(file.key).catch(() => {});
}

export async function setPhoto(
  subject: SubjectRef,
  {
    uploaderUserId,
    stagingKey,
    agreedByUserId,
  }: {
    uploaderUserId: string;
    stagingKey: string;
    agreedByUserId: string | null;
  },
) {
  const file = await commitUpload(uploaderUserId, "profilePhoto", stagingKey);
  const previous = await findProfileBySubject(subject);
  await upsertProfile(subject, {
    photoFileId: file.id,
    photoAgreedByUserId: agreedByUserId,
    photoAgreedAt: agreedByUserId ? new Date() : null,
  });
  if (previous?.photoFileId) await dropPhotoFile(previous.photoFileId);
  return file.id;
}

export async function removePhoto(subject: SubjectRef) {
  const current = await findProfileBySubject(subject);
  if (!current?.photoFileId) return;
  await upsertProfile(subject, {
    photoFileId: null,
    photoAgreedByUserId: null,
    photoAgreedAt: null,
  });
  await dropPhotoFile(current.photoFileId);
}

export async function findPhoto(fileId: string) {
  const owner = await findPhotoOwner(fileId);
  if (!owner?.photo) return null;
  const subject: SubjectRef | null = owner.userId
    ? { kind: "user", id: owner.userId }
    : owner.passengerId
      ? { kind: "passenger", id: owner.passengerId }
      : null;
  return subject ? { subject, file: owner.photo } : null;
}

export type PhotoFile = { id: string; key: string };

export const listPhotoFilesOf = ({
  userIds,
  passengerIds,
}: {
  userIds: string[];
  passengerIds: string[];
}): Promise<PhotoFile[]> =>
  userIds.length + passengerIds.length === 0
    ? Promise.resolve([])
    : findPhotoFilesOf(userIds, passengerIds);

export async function purgePhotoFiles(files: PhotoFile[]) {
  if (files.length === 0) return;
  await deleteStoredFiles(files.map((file) => file.id));
  await Promise.all(
    files.map((file) => deleteObject(file.key).catch(() => {})),
  );
}

export async function transferPassengerProfileToUser(
  passengerId: string,
  userId: string,
) {
  const [own, managed] = await Promise.all([
    findProfileBySubject({ kind: "user", id: userId }),
    findProfileBySubject({ kind: "passenger", id: passengerId }),
  ]);
  if (!managed) return;
  if (!own) {
    await moveProfileToUser(passengerId, userId);
    return;
  }
  await deleteProfileOfPassenger(passengerId);
  if (managed.photoFileId) await dropPhotoFile(managed.photoFileId);
}

export const dismissSetup = (userId: string) =>
  upsertProfile({ kind: "user", id: userId }, { setupDismissedAt: new Date() });

export type PilotStepState = { done: boolean; confirmed: boolean };

export async function getPilotSteps(
  userId: string,
): Promise<Record<PilotStep, PilotStepState>> {
  const ticks = await findPilotSteps(userId);
  const state = (step: PilotStep): PilotStepState => {
    const tick = ticks.find((t) => t.step === step);
    return { done: Boolean(tick), confirmed: Boolean(tick?.confirmedAt) };
  };
  return {
    trainingVideos: state("trainingVideos"),
    workshop: state("workshop"),
  };
}

export const setPilotStep = async (
  userId: string,
  step: PilotStep,
  done: boolean,
) => {
  if (done) {
    await upsertPilotStep(userId, step);
    return;
  }
  const ticks = await findPilotSteps(userId);
  if (ticks.some((tick) => tick.step === step && tick.confirmedAt))
    throw new DomainError("pilotStepConfirmed");
  await deletePilotStep(userId, step);
};

export const confirmPilotStep = async (
  userId: string,
  step: PilotStep,
  confirmedByUserId: string,
) => {
  await upsertPilotStep(userId, step, confirmedByUserId);
};

export const revokePilotStep = async (userId: string, step: PilotStep) => {
  await clearPilotStepConfirmation(userId, step);
};
