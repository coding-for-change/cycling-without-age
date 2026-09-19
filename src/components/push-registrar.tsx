"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { isNative } from "@/lib/native/platform";

const NativePushRegistrar = dynamic(() => import("./native-push-registrar"), {
  ssr: false,
});

const subscribeToNothing = () => () => {};

export function PushRegistrar() {
  const native = useSyncExternalStore(
    subscribeToNothing,
    isNative,
    () => false,
  );

  return native ? <NativePushRegistrar /> : null;
}
