import { randomUUID } from "node:crypto";
import { DomainError } from "@/lib/domain-error";
import { prisma } from "@/lib/prisma";
import { withinRateLimit } from "@/lib/rate-limit";
import { isPdf, toSquareWebp, toWebp } from "./image";
import {
  FILE_LIMITS,
  acceptsUpload,
  extensionOf,
  type FileKind,
  type UploadRequest,
} from "./limits";
import {
  deleteObject,
  headObject,
  presignPut,
  readObject,
  writeObject,
} from "./s3";

export const UPLOAD_LIMIT = { max: 30, windowMs: 10 * 60_000 };

export const withinUploadLimit = (userId: string) =>
  withinRateLimit(`upload:${userId}`, UPLOAD_LIMIT);

const stagingPrefix = (userId: string, kind: FileKind) =>
  `staging/${userId}/${kind}/`;

export async function requestUpload(
  userId: string,
  kind: FileKind,
  { mime, size }: UploadRequest,
) {
  if (!acceptsUpload(kind, mime, size)) throw new DomainError("uploadRejected");
  const key = `${stagingPrefix(userId, kind)}${randomUUID()}`;
  return { key, url: await presignPut(key, mime, size) };
}

async function convertStaged(
  userId: string,
  kind: FileKind,
  stagingKey: string,
) {
  if (!stagingKey.startsWith(stagingPrefix(userId, kind))) return null;
  if (stagingKey.includes("..")) return null;

  const head = await headObject(stagingKey);
  const limit = FILE_LIMITS[kind];
  if (!head || head.size <= 0 || head.size > limit.maxBytes) return null;

  const source = await readObject(stagingKey);
  const id = randomUUID();

  const store = async (body: Buffer, mime: string) => {
    const key = `files/${kind}/${id}.${extensionOf(mime)}`;
    await writeObject(key, body, mime);
    return { key, mime, size: body.length };
  };

  try {
    if (limit.image) {
      const webp = await (
        limit.square ? toSquareWebp(source, limit.square) : toWebp(source)
      ).catch(() => null);
      return webp ? await store(webp, "image/webp") : null;
    }
    return isPdf(source) ? await store(source, "application/pdf") : null;
  } finally {
    await deleteObject(stagingKey).catch(() => {});
  }
}

/**
 * Presign → PUT straight to the bucket → commit. The commit is what turns the
 * staged object into a `StoredFile`, after the server has checked and
 * re-encoded it; nothing the browser sent is served as-is.
 */
export async function commitUpload(
  userId: string,
  kind: FileKind,
  stagingKey: string,
) {
  const stored = await convertStaged(userId, kind, stagingKey);
  if (!stored) throw new DomainError("uploadRejected");
  return prisma.storedFile.create({
    data: { ...stored, kind, uploadedByUserId: userId },
    select: { id: true, mime: true },
  });
}

export const fileKindOf = async (id: string) =>
  (
    await prisma.storedFile.findUnique({
      where: { id },
      select: { kind: true },
    })
  )?.kind ?? null;
