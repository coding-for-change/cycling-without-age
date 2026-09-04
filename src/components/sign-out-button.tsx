"use client";

import { useCallback, useTransition } from "react";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { haptics } from "@/lib/native/haptics";

/**
 * Signing out is the one navigation worth doing the slow way. A `router.push`
 * would leave the client router holding payloads rendered for the person who
 * just left — and the flow state in sessionStorage with them. A full load throws
 * all of it away, which is exactly what "sign out" is supposed to mean.
 *
 * Exported as a hook as well as a button because the admin shell offers the same
 * action from a menu item and from the command bar, and none of those three may
 * be the one that forgets the full reload.
 */
export function useSignOut() {
  const [pending, startTransition] = useTransition();

  const signOut = useCallback(
    () =>
      startTransition(async () => {
        haptics.tap();
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
