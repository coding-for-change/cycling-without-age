import { notifications } from "@/features/notifications";
import { passengers } from "@/features/passengers";
import {
  checklistSteps,
  isChecklistVisible,
  personProfiles,
  subjectSlug,
  summarizeManagedRiders,
  type ChecklistStep,
  type ManagedRidersSummary,
  type SubjectRef,
} from "@/features/person-profiles";
import { profile } from "@/features/profile";
import { rides } from "@/features/rides";
import { isTrainingRequired } from "@/lib/feature-flags";
import { ownReadiness } from "./pilot-readiness";

export type SetupChecklist = {
  steps: ChecklistStep[];
  visible: boolean;
  managedRiders: ManagedRidersSummary;
  aboutYou: boolean;
  trainingRequired: boolean;
};

const refOf = (rider: { id: string }): SubjectRef => ({
  kind: "passenger",
  id: rider.id,
});

export async function getSetupChecklist(
  userId: string,
  perspective: "pilot" | "passenger",
): Promise<SetupChecklist> {
  const [own, account, devices, managed, ownRider] = await Promise.all([
    personProfiles.getProfile({ kind: "user", id: userId }),
    profile.getProfile(userId),
    notifications.listDeviceTokens(userId),
    passengers.listPassengersManagedBy(userId),
    passengers.getOwnPassenger(userId),
  ]);

  const trainingRequired = isTrainingRequired();
  const others = passengers
    .othersOf(managed)
    .map((rider) => ({ name: rider.firstName, ref: refOf(rider) }));
  const [managedProfiles, pilotSteps, firstRideDone, readiness] =
    await Promise.all([
      personProfiles.getProfiles(others.map((rider) => rider.ref)),
      perspective === "pilot" ? personProfiles.getPilotSteps(userId) : null,
      perspective === "pilot" ? rides.hasPilotedRide(userId) : false,
      perspective === "pilot" && trainingRequired ? ownReadiness(userId) : null,
    ]);

  const managedRiders = summarizeManagedRiders(
    others.map((rider) => ({
      ...rider,
      profile: managedProfiles.get(subjectSlug(rider.ref)),
    })),
  );
  const ridesThemself = ownRider !== null;
  const steps = checklistSteps({
    perspective,
    profile: own,
    ridesThemself,
    managesRiders: others.length > 0,
    managedRidersWithoutProfile: managedRiders.missing,
    hasPasskey: (account?._count.passkeys ?? 0) > 0,
    pushOn: Boolean(account?.notifyPush) && devices.length > 0,
    pilotSteps,
    trainingDone: trainingRequired ? (readiness?.coursesDone ?? false) : null,
    firstRideDone,
  });

  return {
    steps,
    visible: isChecklistVisible(steps, own),
    managedRiders,
    aboutYou:
      perspective === "passenger" &&
      !ridesThemself &&
      (others.length > 0 || Boolean(account?.managesOthers)),
    trainingRequired,
  };
}
