"use client";

import { useEffect } from "react";

export const SERVICE_WORKER_URL = "/serwist/sw.js";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register(SERVICE_WORKER_URL, { scope: "/", updateViaCache: "none" })
      .catch(() => {});
  }, []);

  return null;
}
