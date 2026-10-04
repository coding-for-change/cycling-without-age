import type { ReactNode } from "react";
import { ClearOfflineCaches } from "@/components/offline/clear-offline-caches";

export default function SignInLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ClearOfflineCaches />
      {children}
    </>
  );
}
