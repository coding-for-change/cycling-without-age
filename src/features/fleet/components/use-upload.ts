"use client";

import { useCallback } from "react";
import type { FileKind } from "@/lib/storage/limits";
import {
  commitUploadAction,
  requestUploadAction,
  type FleetError,
} from "../actions";

export type UploadResult =
  { ok: true; fileId: string } | { ok: false; error: FleetError };

/**
 * Presign → PUT straight to the bucket → commit. The commit is what turns the
 * staged object into a `StoredFile`, after the server has checked and
 * re-encoded it; nothing the browser sent is served as-is.
 */
export function useUpload(kind: FileKind) {
  const upload = useCallback(
    async (file: Blob): Promise<UploadResult> => {
      const mime = file.type || "application/octet-stream";
      const presigned = await requestUploadAction({
        kind,
        mime,
        size: file.size,
      });
      if (!presigned.ok) return presigned;

      const put = await fetch(presigned.url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": mime },
      }).catch(() => null);
      if (!put?.ok) return { ok: false, error: "uploadRejected" };

      const committed = await commitUploadAction({ kind, key: presigned.key });
      return committed.ok ? { ok: true, fileId: committed.fileId } : committed;
    },
    [kind],
  );

  return { upload };
}
