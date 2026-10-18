"use client";

import { Flag } from "lucide-react";
import type { NotifyLabels } from "@/components/action-feedback";
import { ConfirmButton } from "@/components/confirm-button";
import { cn } from "@/lib/utils";
import { completeRideAction } from "../actions";

export type CompleteRideLabels = {
  label: string;
  title: string;
  body: string;
  confirm: string;
  cancel: string;
  done: string;
};

/**
 * Lifecycle 6D: the statistics moment, tapped at the roadside, so the dialog
 * shows what is about to be counted before it is.
 */
export function CompleteRideButton({
  rideId,
  hero = false,
  labels,
  errors,
  className,
}: {
  rideId: string;
  hero?: boolean;
  labels: CompleteRideLabels;
  errors: NotifyLabels["errors"];
  className?: string;
}) {
  return (
    <ConfirmButton
      {...labels}
      icon={<Flag aria-hidden />}
      variant={hero ? "brand" : "outline"}
      size={hero ? "hero" : "sm"}
      className={cn(!hero && "h-8 border-line text-2sm", className)}
      errors={errors}
      action={() => completeRideAction(rideId)}
    />
  );
}
