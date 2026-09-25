import { randomUUID } from "node:crypto";
import { isPdf, toWebp } from "./image";
import {
  FILE_LIMITS,
  acceptsUpload,
  extensionOf,
  type FileKind,
} from "./limits";
import {
  deleteObject,
  headObject,
  presignGet,
  presignPut,
  readObject,
  writeObject,
} from "./s3";

export * from "./limits";
export { presignGet, deleteObject };

const stagingPrefix = (userId: string, kind: FileKind) =>
  `staging/${userId}/${kind}/`;

export async function prepareUpload(
  userId: string,
  kind: FileKind,
  mime: string,
  size: number,
) {
  if (!acceptsUpload(kind, mime, size)) return null;
  const key = `${stagingPrefix(userId, kind)}${randomUUID()}`;
  return { key, url: await presignPut(key, mime, size) };
}

export type StoredObject = { key: string; mime: string; size: number };

export async function commitUpload(
  userId: string,
  kind: FileKind,
  stagingKey: string,
): Promise<StoredObject | null> {
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
      const webp = await toWebp(source).catch(() => null);
      return webp ? await store(webp, "image/webp") : null;
    }
    return isPdf(source) ? await store(source, "application/pdf") : null;
  } finally {
    await deleteObject(stagingKey).catch(() => {});
  }
}
