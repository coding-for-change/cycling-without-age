"use client";

import Image from "next/image";
import { useTransition } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { clearOfflineCaches } from "@/lib/offline-caches";

export function GoogleButton({ label }: { label: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await clearOfflineCaches().catch(() => {});
          await authClient.signIn.social({
            provider: "google",
            callbackURL: "/onboarding",
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
