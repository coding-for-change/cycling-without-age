import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const UPLOAD_URL_TTL_SECONDS = 5 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 5 * 60;

let client: S3Client | null = null;

function s3() {
  client ??= new S3Client({
    endpoint: process.env.S3_ENDPOINT || undefined,
    region: process.env.S3_REGION || "eu-central-1",
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
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
