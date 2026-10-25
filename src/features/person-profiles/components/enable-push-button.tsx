"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { haptics } from "@/lib/native/haptics";
import { isNative } from "@/lib/native/platform";
import { requestNotificationPermission } from "@/lib/native/push";

const subscribeToNothing = () => () => {};

export function EnablePushButton({
  label,
  deniedMessage,
}: {
  label: string;
  deniedMessage: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const native = useSyncExternalStore(
    subscribeToNothing,
    isNative,
    () => false,
  );

  if (!native) return null;

  const enable = () =>
    startTransition(async () => {
      if (!(await requestNotificationPermission())) {
        haptics.warning();
        toast.error(deniedMessage);
        return;
      }
      haptics.success();
      router.refresh();
    });

  return (
    <Button
      size="sm"
      variant="brand"
      disabled={pending}
      onClick={enable}
    >
      {label}
    </Button>
  );
}
