"use client";

import { useId, useState, useTransition, type ReactNode } from "react";
import type { ActionResult } from "@/components/action-feedback";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { placeFromResolved } from "@/features/rides/components/place";
import type { AddressSearchStrings } from "@/components/address-search";
import { haptics } from "@/lib/native/haptics";
import { PlaceSearch } from "../../../_components/place-search";
import type { Place } from "./ride-where";

export type MakeFunctionalLabels = {
  heading: string;
  hint: string;
  cancel: string;
  place: AddressSearchStrings;
  errors: { generic: string } & Record<string, string>;
};

export function MakeFunctionalPopover({
  open,
  onCancel,
  language,
  onConfirm,
  labels,
  children,
}: {
  open: boolean;
  onCancel: () => void;
  language: string;
  onConfirm: (destination: Place) => Promise<ActionResult>;
  labels: MakeFunctionalLabels;
  children: ReactNode;
}) {
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <PopoverAnchor asChild>
        <div>{children}</div>
      </PopoverAnchor>
      <PopoverContent
        align="end"
        className="w-80 p-3"
      >
        {open ? (
          <MakeFunctionalForm
            language={language}
            onConfirm={onConfirm}
            onCancel={onCancel}
            labels={labels}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function MakeFunctionalForm({
  language,
  onConfirm,
  onCancel,
  labels,
}: {
  language: string;
  onConfirm: (destination: Place) => Promise<ActionResult>;
  onCancel: () => void;
  labels: MakeFunctionalLabels;
}) {
  const errorId = useId();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const confirm = (destination: Place) => {
    setError(null);
    startTransition(async () => {
      const result = await onConfirm(destination);
      if (result.ok) return;
      haptics.error();
      setError(labels.errors[result.error] ?? labels.errors.generic);
    });
  };

  return (
    <div
      aria-busy={pending}
      aria-describedby={error ? errorId : undefined}
      className="grid gap-3"
    >
      <div className="grid gap-1">
        <p className="text-2sm font-medium">{labels.heading}</p>
        <p className="text-xs text-ink-soft">{labels.hint}</p>
      </div>
      <PlaceSearch
        variant="popover"
        autoFocus
        address={null}
        language={language}
        strings={labels.place}
        failed={labels.errors.generic}
        onPlace={(found) => confirm(placeFromResolved(found))}
      />
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-xs text-red"
        >
          {error}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={onCancel}
        >
          {labels.cancel}
        </Button>
      </div>
    </div>
  );
}
