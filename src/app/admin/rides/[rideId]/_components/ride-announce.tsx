"use client";

import { useId } from "react";
import type { InlineFieldLabels } from "@/components/inline-field";
import { Switch } from "@/components/ui/switch";
import { useOptimisticSave } from "@/components/use-optimistic-save";
import { setRideAnnouncedAction } from "@/features/rides/actions";
import { SidePanel } from "../../../_components/side-panel";

export type AnnounceLabels = {
  title: string;
  label: string;
  hint: string;
  field: InlineFieldLabels;
};

/**
 * Lifecycle 4B-b: an event ride announced to the chapter's riders shows on
 * their start screen, and they book a seat themselves until it is full.
 */
export function RideAnnounce({
  rideId,
  announced,
  editable,
  labels,
}: {
  rideId: string;
  announced: boolean;
  editable: boolean;
  labels: AnnounceLabels;
}) {
  const id = useId();
  const { shown, persist } = useOptimisticSave(
    announced,
    (next) => setRideAnnouncedAction({ rideId, announced: next }),
    labels.field,
  );

  return (
    <SidePanel title={labels.title}>
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <label
            htmlFor={id}
            className="text-2sm font-medium"
          >
            {labels.label}
          </label>
          <span className="text-2sm text-ink-soft">{labels.hint}</span>
        </div>
        <Switch
          id={id}
          checked={shown}
          disabled={!editable}
          onCheckedChange={(next) => void persist(next, !next)}
          className="mt-0.5"
        />
      </div>
    </SidePanel>
  );
}
