"use client";

import { useCallback, useTransition } from "react";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { haptics } from "@/lib/native/haptics";
import { deletePushToken, getPushToken } from "@/lib/native/push";
import { unregisterDevice } from "@/features/notifications/actions";

/**
 * The FCM token outlives the session, so a device row left behind would push
 * this person's notifications to whoever signs in on the phone next. Best
 * effort: sign-out never waits on a network that may already be gone.
 */
async function forgetDevice() {
  try {
    const device = await getPushToken();
    if (device) await unregisterDevice({ token: device.token });
    await deletePushToken();
  } catch {
    // Web, or FCM unreachable. The session cookie is the part that matters.
  }
}

export function useSignOut() {
  const [pending, startTransition] = useTransition();

  const signOut = useCallback(
    () =>
      startTransition(async () => {
        haptics.tap();
        await forgetDevice();
        await authClient.signOut();
        try {
          sessionStorage.clear();
        } catch {
          // Private mode. The cookie is already gone, which is the part that matters.
        }
        window.location.href = "/sign-in";
      }),
    [],
  );

  return { signOut, pending };
}

export function SignOutButton({ label }: { label: string }) {
  const { signOut, pending } = useSignOut();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={signOut}
      className="gap-2 rounded-full border-line"
    >
      <LogOut
        className="size-4"
        aria-hidden
      />
      {label}
    </Button>
  );
}
