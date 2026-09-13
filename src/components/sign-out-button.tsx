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
export async function forgetDevice() {
  try {
    const device = await getPushToken();
    if (device) await unregisterDevice({ token: device.token });
    await deletePushToken();
  } catch {
    // Web, or FCM unreachable. The session cookie is the part that matters.
  }
}

/**
 * The tail of every way out of the account: clear the cookie, drop what this tab
 * cached, then leave with a full page load so nothing rendered for the old
 * session survives. `signOut` is tolerated failing — after an account deletion
 * the session row it wants to revoke is already gone, and the cookie it sets is
 * written on the response either way.
 */
export async function finishSignOut() {
  try {
    await authClient.signOut();
  } catch {
    // Already signed out, or the network is gone. The navigation still has to happen.
  }
  try {
    sessionStorage.clear();
  } catch {
    // Private mode. The cookie is already gone, which is the part that matters.
  }
  window.location.href = "/sign-in";
}

export function useSignOut() {
  const [pending, startTransition] = useTransition();

  const signOut = useCallback(
    () =>
      startTransition(async () => {
        haptics.tap();
        await forgetDevice();
        await finishSignOut();
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
