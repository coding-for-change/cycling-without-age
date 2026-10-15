import { passengers } from "@/features/passengers";
import type { ManagedRiderPatchInput } from "@/features/passengers";
import { personProfiles } from "@/features/person-profiles";
import { DomainError } from "@/lib/domain-error";
import { logDomainEvent } from "@/lib/observability/logger";
import {
  accessPerson,
  canManageRider,
  canRemoveRider,
  type Relation,
  type PersonTarget,
  type Viewer,
} from "./person-access";

async function managedRiderChapter(
  viewer: Viewer,
  passengerId: string,
  allowed: (relation: Relation | null, target: PersonTarget) => boolean,
) {
  const found = await accessPerson(viewer, {
    kind: "passenger",
    id: passengerId,
  });
  if (!found || !allowed(found.relation, found.target))
    throw new DomainError("unknownPassenger");
  return found.target.riderChapter?.id ?? null;
}

export async function updateManagedRider({
  viewer,
  passengerId,
  patch,
}: {
  viewer: Viewer;
  passengerId: string;
  patch: ManagedRiderPatchInput;
}) {
  const chapterId = await managedRiderChapter(
    viewer,
    passengerId,
    canManageRider,
  );
  await passengers.updateManagedRider(passengerId, patch);
  return { chapterId };
}

export async function removeManagedRider({
  viewer,
  passengerId,
}: {
  viewer: Viewer;
  passengerId: string;
}) {
  const chapterId = await managedRiderChapter(
    viewer,
    passengerId,
    canRemoveRider,
  );
  const photos = await personProfiles.listPhotoFilesOf({
    userIds: [],
    passengerIds: [passengerId],
  });

  await passengers.removeManagedRider(passengerId);
  await personProfiles.purgePhotoFiles(photos);
  logDomainEvent(
    { type: "passenger.removed", chapterId, actorUserId: viewer.user.id },
    { passenger_id: passengerId },
  );
  return { chapterId };
}
