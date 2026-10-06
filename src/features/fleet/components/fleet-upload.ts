import type { PhotoUpload } from "@/components/photo-gallery/photo-gallery";
import type { FileKind } from "@/lib/storage/limits";
import { commitUploadAction, requestUploadAction } from "../actions";

export const fleetUpload = (kind: FileKind): PhotoUpload => ({
  request: (file) => requestUploadAction({ kind, ...file }),
  commit: ({ key }) => commitUploadAction({ kind, key }),
});
