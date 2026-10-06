import type { PhotoUpload } from "@/components/photo-gallery/photo-gallery";
import {
  commitRidePhotoUploadAction,
  requestRidePhotoUploadAction,
} from "../actions";

export const ridePhotoUpload: PhotoUpload = {
  request: requestRidePhotoUploadAction,
  commit: commitRidePhotoUploadAction,
};
