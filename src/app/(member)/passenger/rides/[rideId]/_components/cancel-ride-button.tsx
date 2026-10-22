"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { NotifyLabels } from "@/components/action-feedback";
import { ConfirmButton } from "@/components/confirm-button";
import { cancelRideAction } from "../../actions";

export function CancelRideButton({
  rideId,
  leaveTo,
  labels,
  errors,
}: {
  rideId: string;
  leaveTo: string;
  labels: {
    label: string;
    title: string;
    body: string;
    confirm: string;
    cancel: string;
    done: string;
  };
  errors: NotifyLabels["errors"];
}) {
  const router = useRouter();
  return (
    <ConfirmButton
      {...labels}
      icon={<X aria-hidden />}
      destructive
      size="default"
      className="min-h-12 flex-1 rounded-full border-line"
      errors={errors}
      action={() => cancelRideAction({ rideId })}
      onDone={() => router.replace(leaveTo)}
    />
  );
}
