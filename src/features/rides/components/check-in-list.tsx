"use client";

import { useOptimistic, useTransition } from "react";
import { Check, Phone, X } from "lucide-react";
import { toast } from "sonner";
import type { NotifyLabels } from "@/components/action-feedback";
import { ConfirmButton } from "@/components/confirm-button";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";
import { removeWalkUpAction, setCheckedInAction } from "../actions";
import type { RosterAttendanceName } from "../schemas";
import { AttendanceBadge } from "./attendance-badge";

export type CheckInEntry = {
  id: string;
  name: string;
  walkUp: boolean;
  attendance: RosterAttendanceName;
  pickup?: string | null;
  phone?: string | null;
  via?: string | null;
};

export type CheckInLabels = {
  attendance: Record<RosterAttendanceName, string>;
  walkUpBadge: string;
  checkInLabel: string;
  undoCheckIn: string;
  checkedIn: string;
  checkedInCount: string;
  undone: string;
  undo: string;
  removeWalkUp: string;
  removed: string;
  removeTitle: string;
  removeBody: string;
  removeConfirm: string;
  cancel: string;
  noRiders: string;
  call?: string;
  via?: string;
  errors: NotifyLabels["errors"];
};

type Change = { id: string; here: boolean };

/**
 * Lifecycle 6B on a phone at the roadside: one big target per rider, the
 * check mark flips at once and the toast offers Undo. A walk-up added by
 * mistake can go again while the door is open.
 */
export function CheckInList({
  rideId,
  entries,
  open,
  language,
  labels,
  compact = false,
}: {
  rideId: string;
  entries: CheckInEntry[];
  open: boolean;
  language: Locale;
  labels: CheckInLabels;
  compact?: boolean;
}) {
  const target = compact ? "size-7" : "size-11";
  const [, startTransition] = useTransition();
  const [shown, show] = useOptimistic(
    entries,
    (current, { id, here }: Change) =>
      current.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              attendance: here ? ("checkedIn" as const) : ("booked" as const),
            }
          : entry,
      ),
  );
  const say = (template: string, values: Record<string, string | number>) =>
    formatMessage(template, values, language);
  const here = shown.filter((entry) => entry.attendance === "checkedIn").length;

  const toggle = (entry: CheckInEntry, next: boolean, undoing = false) =>
    startTransition(async () => {
      haptics.tap();
      show({ id: entry.id, here: next });
      const result = await setCheckedInAction({
        rideId,
        entryId: entry.id,
        checkedIn: next,
      });
      if (!result.ok) {
        haptics.error();
        toast.error(labels.errors[result.error] ?? labels.errors.generic);
        return;
      }
      if (undoing || !next) {
        toast.success(labels.undone);
        return;
      }
      toast.success(say(labels.checkedIn, { name: entry.name }), {
        action: {
          label: labels.undo,
          onClick: () => toggle(entry, false, true),
        },
      });
    });

  if (!shown.length)
    return (
      <p
        className={cn(
          "border border-line p-4 text-2sm text-ink-soft",
          compact ? "rounded-lg" : "rounded-2xl",
        )}
      >
        {labels.noRiders}
      </p>
    );

  return (
    <div className="flex flex-col gap-3">
      <p
        aria-live="polite"
        className="text-2sm text-ink-soft tabular-nums"
      >
        {say(labels.checkedInCount, { count: here, total: shown.length })}
      </p>
      <ol
        className={cn(
          "divide-y divide-line border border-line",
          compact ? "rounded-lg text-2sm" : "rounded-2xl",
        )}
      >
        {shown.map((entry) => {
          const checkedIn = entry.attendance === "checkedIn";
          return (
            <li
              key={entry.id}
              className={cn(
                "flex items-center gap-3 px-3",
                compact ? "min-h-10 py-1.5" : "min-h-14 py-2",
              )}
            >
              {open ? (
                <button
                  type="button"
                  aria-pressed={checkedIn}
                  aria-label={say(
                    checkedIn ? labels.undoCheckIn : labels.checkInLabel,
                    { name: entry.name },
                  )}
                  onClick={() => toggle(entry, !checkedIn)}
                  className={cn(
                    "grid shrink-0 place-items-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none motion-reduce:transition-none",
                    target,
                    checkedIn
                      ? "border-mint bg-mint text-ink"
                      : "border-line text-ink-faint hover:border-ink-faint hover:text-ink-soft",
                  )}
                >
                  <Check
                    aria-hidden
                    className={compact ? "size-4" : "size-5"}
                  />
                </button>
              ) : null}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn("truncate", !compact && "font-medium")}>
                  {entry.name}
                </span>
                {entry.pickup ? (
                  <span className="truncate text-2sm text-ink-soft">
                    {entry.pickup}
                  </span>
                ) : null}
                {entry.walkUp ? (
                  <span className="truncate text-2sm text-ink-soft">
                    {labels.walkUpBadge}
                  </span>
                ) : entry.phone && entry.via && labels.via ? (
                  <span className="truncate text-2sm text-ink-soft">
                    {say(labels.via, { name: entry.via })}
                  </span>
                ) : null}
              </span>
              {open ? null : (
                <AttendanceBadge
                  attendance={entry.attendance}
                  label={labels.attendance[entry.attendance]}
                />
              )}
              {entry.phone && labels.call ? (
                <a
                  href={`tel:${entry.phone.replace(/[^\d+]/g, "")}`}
                  aria-label={say(labels.call, { name: entry.name })}
                  title={entry.phone}
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-line transition-colors hover:bg-canvas-deep motion-reduce:transition-none"
                >
                  <Phone
                    aria-hidden
                    className="size-4"
                  />
                </a>
              ) : null}
              {open && entry.walkUp ? (
                <ConfirmButton
                  iconOnly
                  variant="ghost"
                  destructive
                  icon={<X aria-hidden />}
                  label={say(labels.removeWalkUp, { name: entry.name })}
                  title={say(labels.removeTitle, { name: entry.name })}
                  body={labels.removeBody}
                  confirm={labels.removeConfirm}
                  cancel={labels.cancel}
                  done={say(labels.removed, { name: entry.name })}
                  errors={labels.errors}
                  className={cn("shrink-0 rounded-full", target)}
                  action={() =>
                    removeWalkUpAction({ rideId, entryId: entry.id })
                  }
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
