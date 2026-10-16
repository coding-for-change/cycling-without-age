"use client";

import Image from "next/image";
import { useTransition } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { clearOfflineCaches } from "@/lib/offline-caches";
import { setSignUpIntentAction } from "../actions";

/**
 * A Google account that has no CWA account yet comes back to "create account"
 * when the person only meant to sign in — the same rule as the code flow.
 */
export function GoogleButton({
  label,
  register,
}: {
  label: string;
  register: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await clearOfflineCaches().catch(() => {});
          await setSignUpIntentAction(register);
          await authClient.signIn.social({
            provider: "google",
            callbackURL: "/onboarding",
            errorCallbackURL: "/sign-in",
          });
        })
      }
      size="hero"
      className="gap-3 border-line"
    >
      <Image
        src="/Google_Favicon_2025.svg"
        alt=""
        width={20}
        height={20}
        unoptimized
        className="size-5"
      />
      {label}
    </Button>
  );
}
