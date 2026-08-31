import { Capacitor } from "@capacitor/core";
import type { Coords } from "@/lib/geo";

export type GeoFailure = "denied" | "unsupported" | "timeout" | "error";
export type GeoResult =
  | { ok: true; coords: Coords }
  | { ok: false; reason: GeoFailure };


const OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 8_000,
  maximumAge: 300_000,
};


export function getPosition(): Promise<GeoResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ ok: false, reason: "unsupported" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          ok: true,
          coords: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
        }),
      (error) =>
        resolve({
          ok: false,
          reason:
            error.code === error.PERMISSION_DENIED
              ? "denied"
              : error.code === error.TIMEOUT
                ? "timeout"
                : "error",
        }),
      OPTIONS,
    );
  });
}

/** A denial is re-grantable in a browser popover but only in OS settings on native. */
export const isNative = () => Capacitor.isNativePlatform();
