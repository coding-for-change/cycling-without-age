"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogTitle } from "@/components/ui/dialog";
import { useCloseElement } from "./element-modal";

export function ElementMissing({
  message,
  close: closeLabel,
}: {
  message: string;
  close: string;
}) {
  const close = useCloseElement();
  return (
    <div className="grid flex-1 place-items-center gap-4 p-8 text-center">
      <div className="grid justify-items-center gap-4">
        <DialogTitle className="text-base font-medium text-ink">
          {message}
        </DialogTitle>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={close}
        >
          <X aria-hidden />
          {closeLabel}
        </Button>
      </div>
    </div>
  );
}
