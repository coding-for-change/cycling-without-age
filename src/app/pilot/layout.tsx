"use client";

import "./i18n";
import type { ReactNode } from "react";
import { AppBoot } from "@/components/AppBoot";
import { PilotGate } from "./pilot-context";

export default function PilotLayout({ children }: { children: ReactNode }) {
  return (
    <AppBoot
      audiences={["pilot", "pilot:p1", "global"]}
      watch={{ persona: "pilot", icon: "bike", appName: "CWA Pilot" }}
    >
      <PilotGate>{children}</PilotGate>
    </AppBoot>
  );
}
