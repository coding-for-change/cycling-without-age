"use client";

import { useCallback } from "react";

type Failed<E> = { ok: false; error: E };

export type PresignedUploadResult<E extends string> =
  { ok: true; fileId: string } | Failed<E | "uploadRejected">;

export function usePresignedUpload<E extends string>(
  request: (input: {
    mime: string;
    size: number;
  }) => Promise<{ ok: true; key: string; url: string } | Failed<E>>,
  commit: (input: {
    key: string;
  }) => Promise<{ ok: true; fileId: string } | Failed<E>>,
) {
  const upload = useCallback(
    async (file: Blob): Promise<PresignedUploadResult<E>> => {
      const mime = file.type || "application/octet-stream";
      const presigned = await request({ mime, size: file.size });
      if (!presigned.ok) return presigned;

      const put = await fetch(presigned.url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": mime },
      }).catch(() => null);
      if (!put?.ok) return { ok: false, error: "uploadRejected" };

      const committed = await commit({ key: presigned.key });
      return committed.ok ? { ok: true, fileId: committed.fileId } : committed;
    },
    [request, commit],
  );

  return { upload };
}
