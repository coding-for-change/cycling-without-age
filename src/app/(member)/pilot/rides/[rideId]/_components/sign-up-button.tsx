"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { notify, type NotifyLabels } from "@/components/action-feedback";
import { signUpForRideAction } from "../../actions";

export function SignUpButton({
  rideId,
  label,
  done,
  errors,
}: {
  rideId: string;
  label: string;
  done: string;
  errors: NotifyLabels["errors"];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="brand"
      size="hero"
      disabled={pending}
      aria-busy={pending}
      onClick={() =>
        startTransition(async () => {
          notify(await signUpForRideAction(rideId), { done, errors });
        })
      }
    >
      {label}
    </Button>
  );
}
