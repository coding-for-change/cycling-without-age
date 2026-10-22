import { fleet } from "@/features/fleet";
import { personProfiles } from "@/features/person-profiles";
import { rides } from "@/features/rides";
import { canReadFile } from "@/lib/auth-guards";
import { fileKindOf } from "@/lib/storage";
import { accessPerson, type Viewer } from "./person-access";
import { readableTrainingAttachment } from "./training-access";

export type ReadableFile = { id: string; key: string; mime: string };

export async function readableFile(
  viewer: Viewer,
  fileId: string,
): Promise<ReadableFile | null> {
  const photo = await personProfiles.findPhoto(fileId);
  if (photo)
    return (await accessPerson(viewer, photo.subject)) ? photo.file : null;

  const kind = await fileKindOf(fileId);
  if (!kind) return null;
  if (kind === "trainingAttachment")
    return readableTrainingAttachment(viewer, fileId);
  const found =
    kind === "ridePhoto"
      ? await rides.photoReadRule(fileId)
      : await fleet.fileReadRule(fileId);
  if (!found || !canReadFile(viewer, found.rule)) return null;
  return found.file;
}

export async function publicFile(fileId: string): Promise<ReadableFile | null> {
  return (await fileKindOf(fileId)) === "ridePhoto"
    ? rides.publicEventPhoto(fileId)
    : null;
}
