"use client";

import Image from "next/image";
import { useTransition } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function GoogleButton({ label }: { label: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="lg"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await authClient.signIn.social({
            provider: "google",
            callbackURL: "/onboarding",
          });
        })
      }
      className="h-14 w-full gap-3 rounded-full border-line text-base"
    >
      {}
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
