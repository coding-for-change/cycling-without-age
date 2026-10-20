import {
  abortMultipart,
  completeMultipart,
  createMultipart,
  deleteMediaPrefix,
  deleteObject,
  headObject,
  listParts,
  presignUploadPart,
  type UploadedPart,
} from "@/lib/storage/s3";

export const sourceKeyOf = (mediaKey: string) => `training/sources/${mediaKey}`;

export const mediaPrefixOf = (mediaKey: string, revision?: number) =>
  revision === undefined
    ? `training/v/${mediaKey}/`
    : `training/v/${mediaKey}/${revision}/`;

export const startSourceUpload = createMultipart;

export const signSourceParts = (
  key: string,
  uploadId: string,
  partNumbers: number[],
) =>
  Promise.all(
    partNumbers.map(async (partNumber) => ({
      partNumber,
      url: await presignUploadPart(key, uploadId, partNumber),
    })),
  );

export const finishSourceUpload = (
  key: string,
  uploadId: string,
  parts: UploadedPart[],
) => completeMultipart(key, uploadId, parts);

export const abortSourceUpload = (key: string, uploadId: string) =>
  abortMultipart(key, uploadId).catch(() => undefined);

export const uploadedSourceParts = listParts;

export const sourceSize = async (key: string) =>
  (await headObject(key))?.size ?? null;

export const deleteSource = (key: string) =>
  deleteObject(key).catch(() => undefined);

export const deleteMedia = (mediaKey: string, revision?: number) =>
  deleteMediaPrefix(mediaPrefixOf(mediaKey, revision));

export const deleteStoredObject = (key: string) =>
  deleteObject(key).catch(() => undefined);
