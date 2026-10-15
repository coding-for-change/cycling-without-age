"use client";

import { useTransition } from "react";
import { Check, RotateCcw, UserRound } from "lucide-react";
import { notify, type NotifyLabels } from "@/components/action-feedback";
import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import { AttendanceBadge } from "@/features/rides/components/attendance-badge";
import type { RosterAttendanceName } from "@/features/rides/schemas";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { cancelSeatAction, confirmSeatAction } from "../../actions";

export type SeatAnswerLabels = {
  hint: string;
  confirm: string;
  confirmed: string;
  retake: string;
  retaken: string;
  states: Record<RosterAttendanceName, string>;
  cancel: {
    label: string;
    title: string;
    body: string;
    confirm: string;
    cancel: string;
    done: string;
  };
  errors: NotifyLabels["errors"];
};

export type SeatRider = {
  passengerId: string;
  name: string;
  attendance: RosterAttendanceName;
};

/**
 * Lifecycle 5B-b, where the reminder's link lands: each rider this account
 * books for, where their seat stands, and the answer to give while the ride
 * is still ahead.
 */
export function SeatAnswers({
  rideId,
  riders,
  answerable,
  language,
  labels,
}: {
  rideId: string;
  riders: SeatRider[];
  answerable: boolean;
  language: Locale;
  labels: SeatAnswerLabels;
}) {
  const [pending, startTransition] = useTransition();
  const asking =
    answerable && riders.some((rider) => rider.attendance === "booked");

  const confirm = (rider: SeatRider, done: string) =>
    startTransition(async () => {
      const result = await confirmSeatAction({
        rideId,
        passengerId: rider.passengerId,
      });
      notify(result, { done, errors: labels.errors });
    });

  return (
    <div className="flex flex-col gap-3">
      {asking ? <p className="text-sm">{labels.hint}</p> : null}
      <ul className="flex flex-col gap-3">
        {riders.map((rider) => {
          const open =
            answerable &&
            (rider.attendance === "booked" ||
              rider.attendance === "confirmed" ||
              rider.attendance === "cancelled");
          return (
            <li
              key={rider.passengerId}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-mint-tint">
                  <UserRound
                    aria-hidden
                    className="size-4"
                  />
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {rider.name}
                </span>
                <AttendanceBadge
                  attendance={rider.attendance}
                  label={labels.states[rider.attendance]}
                />
              </div>
              {open ? (
                <div className="flex flex-wrap gap-3 pl-12">
                  {rider.attendance === "booked" ? (
                    <Button
                      type="button"
                      variant="brand"
                      disabled={pending}
                      onClick={() => confirm(rider, labels.confirmed)}
                      className="min-h-11 flex-1 rounded-full sm:flex-none"
                    >
                      <Check aria-hidden />
                      {labels.confirm}
                    </Button>
                  ) : null}
                  {rider.attendance === "cancelled" ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pending}
                      onClick={() => confirm(rider, labels.retaken)}
                      className="min-h-11 flex-1 rounded-full border-line sm:flex-none"
                    >
                      <RotateCcw aria-hidden />
                      {labels.retake}
                    </Button>
                  ) : (
                    <ConfirmButton
                      {...labels.cancel}
                      title={formatMessage(
                        labels.cancel.title,
                        { name: rider.name },
                        language,
                      )}
                      destructive
                      size="default"
                      variant={
                        rider.attendance === "confirmed" ? "ghost" : "outline"
                      }
                      className="min-h-11 flex-1 rounded-full sm:flex-none"
                      errors={labels.errors}
                      action={() =>
                        cancelSeatAction({
                          rideId,
                          passengerId: rider.passengerId,
                        })
                      }
                    />
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
