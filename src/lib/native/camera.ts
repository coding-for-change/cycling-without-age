import { isNative } from "./platform";

const camera = () => import("@capacitor/camera");

export const canTakePhoto = isNative;

export async function takePhoto(): Promise<Blob | null> {
  if (!isNative()) return null;
  try {
    const { Camera } = await camera();
    const photo = await Camera.takePhoto({
      quality: 80,
      targetWidth: 2000,
      targetHeight: 2000,
      correctOrientation: true,
    });
    if (!photo.webPath) return null;
    return await (await fetch(photo.webPath)).blob();
  } catch {
    return null;
  }
}
