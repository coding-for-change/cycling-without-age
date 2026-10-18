"use client";

import { RotateCcw } from "lucide-react";
import type { NotifyLabels } from "@/components/action-feedback";
import { ConfirmButton } from "@/components/confirm-button";
import { reopenRideAction } from "@/features/rides/actions";
import { PROPERTY_BUTTON_DANGER } from "../../../_components/properties";

export type ReopenLabels = {
  label: string;
  title: string;
  body: string;
  confirm: string;
  cancel: string;
  done: string;
};

/** A closed roster taken back to correct it — the chapter's call, never a pilot's. */
export function RideReopen({
  rideId,
  labels,
  errors,
}: {
  rideId: string;
  labels: ReopenLabels;
  errors: NotifyLabels["errors"];
}) {
  return (
    <ConfirmButton
      {...labels}
      destructive
      icon={<RotateCcw aria-hidden />}
      className={PROPERTY_BUTTON_DANGER}
      errors={errors}
      action={() => reopenRideAction(rideId)}
    />
  );
}
