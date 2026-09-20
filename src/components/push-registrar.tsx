"use client";

import { useEffect, useSyncExternalStore } from "react";
import { isAppPath } from "@/lib/app-path";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { registerDevice } from "@/features/notifications/actions";
import {
  getPushToken,
  hasNotificationPermission,
  isNative,
  onPushOpened,
  onPushReceived,
  onPushToken,
} from "@/lib/native/push";
import type { PushDevice } from "@/lib/native/push";

const subscribeToNothing = () => () => {};

/**
 * Gates on the shell before anything else mounts: on the web there is no token
 * to register, and `useSession` would fetch for every visitor to pay for it.
 */
export function PushRegistrar() {
  const native = useSyncExternalStore(
    subscribeToNothing,
    isNative,
    () => false,
  );

  return native ? <NativePushRegistrar /> : null;
}

function NativePushRegistrar() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) return;

    let active = true;

    const remember = (device: PushDevice | null) => {
      if (!device || !active) return;
      void hasNotificationPermission()
        .then((granted) => {
          if (granted && active) return registerDevice(device);
        })
        .catch(() => {});
    };

    void getPushToken()
      .then(remember)
      .catch(() => {});

    const stops = [
      onPushToken(remember),
      onPushOpened((href) => {
        if (isAppPath(href)) router.push(href);
      }),
      onPushReceived(({ title, body }) => {
        if (title || body) {
          toast(title || body, title ? { description: body } : undefined);
        }
        router.refresh();
      }),
    ];

    return () => {
      active = false;
      stops.forEach((stop) => stop());
    };
  }, [userId, router]);

  return null;
}
