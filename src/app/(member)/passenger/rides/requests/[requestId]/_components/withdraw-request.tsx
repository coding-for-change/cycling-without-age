"use client";

import { X } from "lucide-react";
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
      icon={<X aria-hidden />}
      destructive
      size="default"
      className="min-h-12 flex-1 rounded-full border-line sm:flex-none sm:px-6"
      errors={errors}
      action={() => withdrawRideRequestAction(requestId)}
    />
  );
}
