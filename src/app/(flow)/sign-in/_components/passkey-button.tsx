"use client";

import { useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { haptics } from "@/lib/native/haptics";
import { isNative } from "@/lib/native/platform";
import { signInWithPasskey } from "@/lib/passkey-client";

const NEVER_CHANGES = () => () => {};
const hasPasskeys = () =>
  isNative() || typeof window.PublicKeyCredential !== "undefined";

export function PasskeyButton({ label }: { label: string }) {
  const router = useRouter();
  const available = useSyncExternalStore(
    NEVER_CHANGES,
    hasPasskeys,
    () => false,
  );
  const [pending, startTransition] = useTransition();

  if (!available) return null;

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await signInWithPasskey();

          if (result.error) return;
          haptics.success();
          router.replace("/onboarding");
        })
      }
      size="hero"
      className="gap-3 border-line"
    >
      <KeyRound
        className="size-5"
        aria-hidden
      />
      {label}
    </Button>
  );
}
