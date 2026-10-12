"use client";

import { ConfirmButton } from "@/components/confirm-button";
import type { NotifyLabels } from "@/components/action-feedback";
import { withdrawFromRideAction } from "../../actions";

export type WithdrawLabels = {
  label: string;
  title: string;
  body: string;
  confirm: string;
  cancel: string;
  done: string;
};

export function WithdrawButton({
  rideId,
  labels,
  errors,
}: {
  rideId: string;
  labels: WithdrawLabels;
  errors: NotifyLabels["errors"];
}) {
  return (
    <ConfirmButton
      {...labels}
      destructive
      size="default"
      className="min-h-11 w-full rounded-full sm:w-fit"
      errors={errors}
      action={() => withdrawFromRideAction(rideId)}
    />
  );
}
