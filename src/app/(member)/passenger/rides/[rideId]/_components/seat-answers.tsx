"use client";

import { UserRound } from "lucide-react";
import type { NotifyLabels } from "@/components/action-feedback";
import { ConfirmButton } from "@/components/confirm-button";
import { AttendanceBadge } from "@/features/rides/components/attendance-badge";
import type { RosterAttendanceName } from "@/features/rides/schemas";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { cancelSeatAction } from "../../actions";

export type SeatAnswerLabels = {
  states: Record<RosterAttendanceName, string>;
  cancel: {
    label: string;
    aria: string;
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
 * books for and holds a seat for, with the way to give one seat up while the
 * ride is still ahead.
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
  const named = (template: string, rider: SeatRider) =>
    formatMessage(template, { name: rider.name }, language);

  return (
    <ul className="flex flex-col gap-3">
      {riders.map((rider) => (
        <li
          key={rider.passengerId}
          className="flex flex-wrap items-center gap-3"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-mint-tint">
            <UserRound
              aria-hidden
              className="size-4"
            />
          </span>
          <span className="min-w-0 flex-1 truncate font-medium">
            {rider.name}
          </span>
          {rider.attendance !== "booked" ? (
            <AttendanceBadge
              attendance={rider.attendance}
              label={labels.states[rider.attendance]}
            />
          ) : answerable ? (
            <ConfirmButton
              {...labels.cancel}
              title={named(labels.cancel.title, rider)}
              ariaLabel={named(labels.cancel.aria, rider)}
              destructive
              size="default"
              variant="ghost"
              className="min-h-11 shrink-0 rounded-full px-4 text-ink-soft hover:bg-canvas-deep hover:text-ink"
              errors={labels.errors}
              action={() =>
                cancelSeatAction({ rideId, passengerId: rider.passengerId })
              }
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
