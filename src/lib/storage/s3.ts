import { createWriteStream } from "node:fs";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  ListPartsCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const UPLOAD_URL_TTL_SECONDS = 5 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 5 * 60;
const PART_URL_TTL_SECONDS = 60 * 60;
const IMMUTABLE = "public, max-age=31536000, immutable";

let client: S3Client | null = null;

function s3() {
  client ??= new S3Client({
    endpoint: process.env.S3_ENDPOINT || undefined,
    region: process.env.S3_REGION || "eu-central-1",
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    },
  });
  return client;
}

const bucket = () => {
  const name = process.env.S3_BUCKET;
  if (!name) throw new Error("S3_BUCKET is not configured");
  return name;
};

const mediaBucket = () => {
  const name = process.env.S3_MEDIA_BUCKET;
  if (!name) throw new Error("S3_MEDIA_BUCKET is not configured");
  return name;
};

export const presignPut = (key: string, mime: string, size: number) =>
  getSignedUrl(
    s3(),
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      ContentType: mime,
      ContentLength: size,
    }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS },
  );

export const presignGet = (key: string, mime: string, fileName: string) =>
  getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ResponseContentType: mime,
      ResponseCacheControl: "private, max-age=300",
      ResponseContentDisposition: `inline; filename="${fileName.replace(/[^\w.-]/g, "_")}"`,
    }),
    { expiresIn: DOWNLOAD_URL_TTL_SECONDS },
  );

export async function headObject(key: string) {
  try {
    const head = await s3().send(
      new HeadObjectCommand({ Bucket: bucket(), Key: key }),
    );
    return { size: head.ContentLength ?? 0 };
  } catch {
    return null;
  }
}

export async function readObject(key: string) {
  const result = await s3().send(
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
  );
  if (!result.Body) throw new Error("empty object");
  return Buffer.from(await result.Body.transformToByteArray());
}

export const writeObject = (key: string, body: Buffer, mime: string) =>
  s3().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: mime,
    }),
  );

export const deleteObject = (key: string) =>
  s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));

export async function createMultipart(key: string, mime: string) {
  const result = await s3().send(
    new CreateMultipartUploadCommand({
      Bucket: bucket(),
      Key: key,
      ContentType: mime,
    }),
  );
  if (!result.UploadId) throw new Error("multipart upload has no id");
  return result.UploadId;
}

export const presignUploadPart = (
  key: string,
  uploadId: string,
  partNumber: number,
) =>
  getSignedUrl(
    s3(),
    new UploadPartCommand({
      Bucket: bucket(),
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    }),
    { expiresIn: PART_URL_TTL_SECONDS },
  );

export type UploadedPart = { partNumber: number; etag: string };

export const completeMultipart = (
  key: string,
  uploadId: string,
  parts: UploadedPart[],
) =>
  s3().send(
    new CompleteMultipartUploadCommand({
      Bucket: bucket(),
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: [...parts]
          .sort((a, b) => a.partNumber - b.partNumber)
          .map(({ partNumber, etag }) => ({
            PartNumber: partNumber,
            ETag: etag,
          })),
      },
    }),
  );

export const abortMultipart = (key: string, uploadId: string) =>
  s3().send(
    new AbortMultipartUploadCommand({
      Bucket: bucket(),
      Key: key,
      UploadId: uploadId,
    }),
  );

export async function listParts(key: string, uploadId: string) {
  const parts: UploadedPart[] = [];
  let marker: string | undefined;
  for (;;) {
    const page = await s3().send(
      new ListPartsCommand({
        Bucket: bucket(),
        Key: key,
        UploadId: uploadId,
        PartNumberMarker: marker,
      }),
    );
    for (const part of page.Parts ?? [])
      if (part.PartNumber && part.ETag)
        parts.push({ partNumber: part.PartNumber, etag: part.ETag });
    if (!page.IsTruncated || !page.NextPartNumberMarker) return parts;
    marker = page.NextPartNumberMarker;
  }
}

export class ObjectTooLarge extends Error {}

export async function downloadToFile(
  key: string,
  path: string,
  maxBytes: number,
) {
  const result = await s3().send(
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
  );
  if (!result.Body) throw new Error("empty object");
  if ((result.ContentLength ?? 0) > maxBytes) throw new ObjectTooLarge();
  let seen = 0;
  const cap = new Transform({
    transform(chunk: Buffer, _encoding, done) {
      seen += chunk.length;
      done(seen > maxBytes ? new ObjectTooLarge() : null, chunk);
    },
  });
  await pipeline(result.Body as Readable, cap, createWriteStream(path));
  return seen;
}

export const putMediaObject = (
  key: string,
  body: Buffer | Readable,
  mime: string,
  size?: number,
) =>
  s3().send(
    new PutObjectCommand({
      Bucket: mediaBucket(),
      Key: key,
      Body: body,
      ContentType: mime,
      ContentLength: size,
      CacheControl: IMMUTABLE,
    }),
  );

export async function readMediaObject(key: string) {
  const result = await s3().send(
    new GetObjectCommand({ Bucket: mediaBucket(), Key: key }),
  );
  if (!result.Body) throw new Error("empty object");
  return Buffer.from(await result.Body.transformToByteArray());
}

export async function deleteMediaPrefix(prefix: string) {
  if (!prefix.endsWith("/") || prefix.length < 4)
    throw new Error("refusing to delete an open-ended prefix");
  let removed = 0;
  let token: string | undefined;
  for (;;) {
    const page = await s3().send(
      new ListObjectsV2Command({
        Bucket: mediaBucket(),
        Prefix: prefix,
        ContinuationToken: token,
      }),
    );
    const keys = (page.Contents ?? []).flatMap((item) =>
      item.Key ? [{ Key: item.Key }] : [],
    );
    if (keys.length > 0) {
      await s3().send(
        new DeleteObjectsCommand({
          Bucket: mediaBucket(),
          Delete: { Objects: keys, Quiet: true },
        }),
      );
      removed += keys.length;
    }
    if (!page.IsTruncated || !page.NextContinuationToken) return removed;
    token = page.NextContinuationToken;
  }
}
