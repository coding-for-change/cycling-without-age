"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { haptics } from "@/lib/native/haptics";

/**
 * Signing out is the one navigation worth doing the slow way. A `router.push`
 * would leave the client router holding payloads rendered for the person who
 * just left — and the flow state in sessionStorage with them. A full load throws
 * all of it away, which is exactly what "sign out" is supposed to mean.
 */
export function SignOutButton({ label }: { label: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          haptics.tap();
          await authClient.signOut();
          try {
            sessionStorage.clear();
          } catch {
            // Private mode. The cookie is already gone, which is the part that matters.
          }
          window.location.href = "/sign-in";
        })
      }
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
