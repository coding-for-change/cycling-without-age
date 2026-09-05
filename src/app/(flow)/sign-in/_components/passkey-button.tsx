"use client";

import { useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { haptics } from "@/lib/native/haptics";

const NEVER_CHANGES = () => () => {};
const hasWebAuthn = () => typeof window.PublicKeyCredential !== "undefined";

export function PasskeyButton({ label }: { label: string }) {
  const router = useRouter();
  const available = useSyncExternalStore(
    NEVER_CHANGES,
    hasWebAuthn,
    () => false,
  );
  const [pending, startTransition] = useTransition();

  if (!available) return null;

  return (
    <Button
      variant="outline"
      size="lg"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await authClient.signIn.passkey();

          if (result?.error) return;
          haptics.success();
          router.replace("/onboarding");
        })
      }
      className="h-14 w-full gap-3 rounded-full border-line text-base"
    >
      <KeyRound
        className="size-5"
        aria-hidden
      />
      {label}
    </Button>
  );
}
