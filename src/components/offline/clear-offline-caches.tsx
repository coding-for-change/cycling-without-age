"use client";

import { useEffect } from "react";
import { clearOfflineCaches } from "@/lib/offline-caches";

export function ClearOfflineCaches() {
  useEffect(() => {
    clearOfflineCaches().catch(() => {});
  }, []);
  return null;
}
