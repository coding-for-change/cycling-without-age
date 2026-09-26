"use client";

import { useState } from "react";
import { LifeBuoy } from "lucide-react";
import { ReportProblemDrawer } from "@/components/report-problem/report-problem-drawer";
import { SettingsGroup, SettingsRow } from "@/components/settings-group";
import type { AccountData } from "./types";

export function SupportSection({
  data,
  label,
}: {
  data: AccountData;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const strings = data.strings.support;

  return (
    <>
      <SettingsGroup
        label={label}
        footer={strings.body}
      >
        <SettingsRow
          icon={LifeBuoy}
          label={strings.open}
          chevron
          onClick={() => setOpen(true)}
        />
      </SettingsGroup>
      <ReportProblemDrawer
        open={open}
        onOpenChange={setOpen}
        strings={strings.drawer}
      />
    </>
  );
}
