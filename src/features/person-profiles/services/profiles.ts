import { prisma } from "@/lib/prisma";
import type { PilotStep, Prisma } from "@/generated/prisma";
import type { SubjectRef } from "../schemas";

const profileSelect = {
  id: true,
  userId: true,
  passengerId: true,
  photoFileId: true,
  photoAgreedByUserId: true,
  bio: true,
  interests: true,
  customInterests: true,
  prompts: true,
  hideAge: true,
  accessibilityTags: true,
  accessibilityNone: true,
  healthConsentAt: true,
  healthConsentByUserId: true,
  setupDismissedAt: true,
  updatedAt: true,
} satisfies Prisma.PersonProfileSelect;

export type ProfileRow = Prisma.PersonProfileGetPayload<{
  select: typeof profileSelect;
}>;

const ownerWhere = (subject: SubjectRef) =>
  subject.kind === "user"
    ? { userId: subject.id }
    : { passengerId: subject.id };

export const findProfileBySubject = (subject: SubjectRef) =>
  prisma.personProfile.findUnique({
    where: ownerWhere(subject),
    select: profileSelect,
  });

export const findProfilesBySubjects = (
  userIds: string[],
  passengerIds: string[],
) =>
  prisma.personProfile.findMany({
    where: {
      OR: [{ userId: { in: userIds } }, { passengerId: { in: passengerIds } }],
    },
    select: profileSelect,
  });

export const upsertProfile = (
  subject: SubjectRef,
  data: Prisma.PersonProfileUncheckedUpdateInput,
) =>
  prisma.personProfile.upsert({
    where: ownerWhere(subject),
    create: {
      ...ownerWhere(subject),
      ...(data as Prisma.PersonProfileUncheckedCreateInput),
    },
    update: data,
    select: profileSelect,
  });

export const findPhotoOwner = (fileId: string) =>
  prisma.personProfile.findUnique({
    where: { photoFileId: fileId },
    select: {
      userId: true,
      passengerId: true,
      photo: { select: { id: true, key: true, mime: true } },
    },
  });

export const findStoredFileKey = (id: string) =>
  prisma.storedFile.findUnique({ where: { id }, select: { key: true } });

export const deleteStoredFile = (id: string) =>
  prisma.storedFile.deleteMany({ where: { id, kind: "profilePhoto" } });

export const findPhotoFilesOf = (userIds: string[], passengerIds: string[]) =>
  prisma.storedFile.findMany({
    where: {
      kind: "profilePhoto",
      profilePhoto: {
        OR: [
          { userId: { in: userIds } },
          { passengerId: { in: passengerIds } },
        ],
      },
    },
    select: { id: true, key: true },
  });

export const deleteStoredFiles = (ids: string[]) =>
  prisma.storedFile.deleteMany({
    where: { id: { in: ids }, kind: "profilePhoto" },
  });

export const deleteProfileOfPassenger = (passengerId: string) =>
  prisma.personProfile.deleteMany({ where: { passengerId } });

export const moveProfileToUser = (passengerId: string, userId: string) =>
  prisma.personProfile.update({
    where: { passengerId },
    data: { passengerId: null, userId },
    select: { id: true },
  });

export const findPilotSteps = (userId: string) =>
  prisma.pilotStepTick.findMany({
    where: { userId },
    select: { step: true, tickedAt: true, confirmedAt: true },
  });

export const upsertPilotStep = (
  userId: string,
  step: PilotStep,
  confirmedByUserId?: string,
) =>
  prisma.pilotStepTick.upsert({
    where: { userId_step: { userId, step } },
    create: {
      userId,
      step,
      ...(confirmedByUserId
        ? { confirmedByUserId, confirmedAt: new Date() }
        : {}),
    },
    update: confirmedByUserId
      ? { confirmedByUserId, confirmedAt: new Date() }
      : {},
  });

export const clearPilotStepConfirmation = (userId: string, step: PilotStep) =>
  prisma.pilotStepTick.updateMany({
    where: { userId, step },
    data: { confirmedByUserId: null, confirmedAt: null },
  });

export const deletePilotStep = (userId: string, step: PilotStep) =>
  prisma.pilotStepTick.deleteMany({
    where: { userId, step, confirmedAt: null },
  });
