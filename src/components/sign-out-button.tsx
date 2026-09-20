"use client";

import { useCallback, useTransition } from "react";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { haptics } from "@/lib/native/haptics";
import { deletePushToken, getPushToken } from "@/lib/native/push";
import { unregisterDevice } from "@/features/notifications/actions";

export async function forgetDevice() {
  try {
    const device = await getPushToken();
    if (device) await unregisterDevice({ token: device.token });
    await deletePushToken();
  } catch {}
}

export async function finishSignOut() {
  try {
    await authClient.signOut();
  } catch {}
  try {
    sessionStorage.clear();
  } catch {}
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
