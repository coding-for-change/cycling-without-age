"use client";

import type { NotifyLabels } from "@/components/action-feedback";
import { ConfirmButton } from "@/components/confirm-button";
import { withdrawRideRequestAction } from "@/features/ride-requests/actions";

export type WithdrawRequestLabels = {
  label: string;
  title: string;
  body: string;
  confirm: string;
  cancel: string;
  done: string;
};

export function WithdrawRequest({
  requestId,
  labels,
  errors,
}: {
  requestId: string;
  labels: WithdrawRequestLabels;
  errors: NotifyLabels["errors"];
}) {
  return (
    <ConfirmButton
      {...labels}
      destructive
      size="default"
      className="min-h-11 w-full rounded-full sm:w-fit"
      errors={errors}
      action={() => withdrawRideRequestAction(requestId)}
    />
  );
}
