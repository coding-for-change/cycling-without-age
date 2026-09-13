"use client";

import { useCallback, useTransition } from "react";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { haptics } from "@/lib/native/haptics";

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
