"use client";

/* Passenger app (senior mode, chapter München) — big type + touch targets via
   the `senior` wrapper. Watches Maria's notification stream for push banners. */

import "./i18n";
import type { ReactNode } from "react";
import { AppBoot } from "@/components/AppBoot";
import { PassengerShell } from "./shell";

export default function PassengerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="senior">
      <div className="app">
        <AppBoot
          audiences={["client:c1", "global"]}
          watch={{ persona: "passenger", icon: "heart", appName: "CWA" }}
        >
          <PassengerShell>{children}</PassengerShell>
        </AppBoot>
      </div>
    </div>
  );
}
