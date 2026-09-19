"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { isAppPath } from "@/lib/app-path";
import { authClient } from "@/lib/auth-client";
import { registerDevice } from "@/features/notifications/actions";
import {
  getPushToken,
  hasNotificationPermission,
  onPushOpened,
  onPushReceived,
  onPushToken,
} from "@/lib/native/push";
import type { PushDevice } from "@/lib/native/push";

export default function NativePushRegistrar() {
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
