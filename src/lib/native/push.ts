import { Capacitor } from "@capacitor/core";
import { isAppPath } from "@/lib/app-path";
import type { PluginListenerHandle } from "@capacitor/core";

export type PushPlatform = "ios" | "android";
export type PushDevice = { token: string; platform: PushPlatform };
export type PushPayload = { title: string; body: string; href: string | null };
export type Unsubscribe = () => void;

const NOOP: Unsubscribe = () => {};

const tokenListeners = new Set<(device: PushDevice) => void>();

const messaging = () => import("@capacitor-firebase/messaging");

const nativePlatform = (): PushPlatform | null => {
  if (!Capacitor.isNativePlatform()) return null;
  const platform = Capacitor.getPlatform();
  return platform === "ios" || platform === "android" ? platform : null;
};

/**
 * The href travels inside the push payload, so it is only as trustworthy as
 * whoever sent it: anything but an app-relative path would be an open redirect.
 */
const appPath = (data: unknown): string | null => {
  const href = (data as { href?: unknown } | null | undefined)?.href;
  return isAppPath(href) ? href : null;
};

/**
 * `addListener` resolves a round trip later. An effect that unmounts before
 * that would never see the handle, so the unsubscribe closes over a flag and
 * the promise removes the handle it just received.
 */
const subscribe = (open: () => Promise<PluginListenerHandle>): Unsubscribe => {
  let handle: PluginListenerHandle | null = null;
  let cancelled = false;

  open()
    .then((opened) => {
      handle = opened;
      if (cancelled) void handle.remove();
    })
    .catch(() => {});

  return () => {
    cancelled = true;
    void handle?.remove();
    handle = null;
  };
};

export { isNative } from "./platform";

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { receive } = await (await messaging()).FirebaseMessaging.requestPermissions();
      const granted = receive === "granted";
      if (granted) {
        const device = await getPushToken();
        if (device) tokenListeners.forEach((listener) => listener(device));
      }
      return granted;
    }
    if (typeof Notification === "undefined") return false;
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { receive } = await (await messaging()).FirebaseMessaging.checkPermissions();
    return receive === "granted";
  } catch {
    return false;
  }
}

export async function getPushToken(): Promise<PushDevice | null> {
  const platform = nativePlatform();
  if (!platform) return null;
  try {
    const { token } = await (await messaging()).FirebaseMessaging.getToken();
    return token ? { token, platform } : null;
  } catch {
    return null;
  }
}

export async function deletePushToken(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await (await messaging()).FirebaseMessaging.deleteToken();
  } catch {
    // Signing out must not depend on FCM being reachable.
  }
}

export function onPushToken(cb: (device: PushDevice) => void): Unsubscribe {
  const platform = nativePlatform();
  if (!platform) return NOOP;
  tokenListeners.add(cb);
  const stop = subscribe(async () =>
    (await messaging()).FirebaseMessaging.addListener("tokenReceived", ({ token }) => {
      if (token) cb({ token, platform });
    }),
  );
  return () => {
    tokenListeners.delete(cb);
    stop();
  };
}

export function onPushReceived(cb: (push: PushPayload) => void): Unsubscribe {
  if (!Capacitor.isNativePlatform()) return NOOP;
  return subscribe(async () =>
    (await messaging()).FirebaseMessaging.addListener(
      "notificationReceived",
      ({ notification }) => {
        cb({
          title: notification.title ?? "",
          body: notification.body ?? "",
          href: appPath(notification.data),
        });
      },
    ),
  );
}

export function onPushOpened(cb: (href: string) => void): Unsubscribe {
  if (!Capacitor.isNativePlatform()) return NOOP;
  return subscribe(async () =>
    (await messaging()).FirebaseMessaging.addListener(
      "notificationActionPerformed",
      ({ notification }) => {
        const href = appPath(notification.data);
        if (href) cb(href);
      },
    ),
  );
}
