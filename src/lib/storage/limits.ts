import { z } from "zod";

export const FILE_KINDS = [
  "typePhoto",
  "typeManual",
  "trishawPhoto",
  "entrancePhoto",
  "damagePhoto",
  "ridePhoto",
] as const;
export type FileKind = (typeof FILE_KINDS)[number];

const MB = 1024 * 1024;

export const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;

type Limit = { mimes: readonly string[]; maxBytes: number; image: boolean };

const IMAGE: Limit = { mimes: IMAGE_MIMES, maxBytes: 10 * MB, image: true };

export const FILE_LIMITS: Record<FileKind, Limit> = {
  typePhoto: IMAGE,
  trishawPhoto: IMAGE,
  entrancePhoto: IMAGE,
  damagePhoto: IMAGE,
  ridePhoto: IMAGE,
  typeManual: { mimes: ["application/pdf"], maxBytes: 20 * MB, image: false },
};

export const extensionOf = (mime: string) =>
  mime === "application/pdf" ? "pdf" : "webp";

export const acceptsUpload = (kind: FileKind, mime: string, size: number) => {
  const limit = FILE_LIMITS[kind];
  return limit.mimes.includes(mime) && size > 0 && size <= limit.maxBytes;
};

export const acceptAttribute = (kind: FileKind) =>
  FILE_LIMITS[kind].mimes.join(",");

export const uploadRequest = z.object({
  mime: z.string().min(1).max(100),
  size: z.number().int().positive(),
});
export type UploadRequest = z.infer<typeof uploadRequest>;

export const uploadCommit = z.object({ key: z.string().min(1).max(255) });
