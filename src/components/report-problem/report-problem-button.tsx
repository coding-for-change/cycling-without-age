"use client";

import { useState } from "react";
import { LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportProblemDrawer } from "./report-problem-drawer";
import type { SupportStrings } from "./strings";

export function ReportProblemButton({
  strings,
  className,
}: {
  strings: SupportStrings;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={className}
        onClick={() => setOpen(true)}
      >
        <LifeBuoy />
        {strings.open}
      </Button>
      <ReportProblemDrawer
        open={open}
        onOpenChange={setOpen}
        strings={strings.drawer}
      />
    </>
  );
}
