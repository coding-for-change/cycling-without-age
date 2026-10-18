"use client";

import { useTransition } from "react";
import { UserX } from "lucide-react";
import { notify, type NotifyLabels } from "@/components/action-feedback";
import { PersonChip } from "@/components/person-avatar";
import { Button } from "@/components/ui/button";
import { setPilotNoShowAction } from "@/features/rides/actions";
import { AttendanceBadge } from "@/features/rides/components/attendance-badge";
import type { AssignmentAttendanceName } from "@/features/rides/schemas";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";
import { DetailList, DetailListRow } from "../../../_components/detail-page";

export type PilotAttendanceRow = {
  id: string;
  name: string;
  avatar: string;
  href: string | null;
  attendance: AssignmentAttendanceName;
};

export type PilotAttendanceLabels = {
  attendance: Record<AssignmentAttendanceName, string>;
  noShow: string;
  noShowLabel: string;
  marked: string;
  cleared: string;
  errors: NotifyLabels["errors"];
};

/** Report 1: a pilot on the ride who never came is marked, never removed. */
export function RidePilotAttendance({
  rideId,
  pilots,
  language,
  labels,
}: {
  rideId: string;
  pilots: PilotAttendanceRow[];
  language: Locale;
  labels: PilotAttendanceLabels;
}) {
  const [pending, startTransition] = useTransition();
  const say = (template: string, name: string) =>
    formatMessage(template, { name }, language);

  const mark = (pilot: PilotAttendanceRow, noShow: boolean) =>
    startTransition(async () => {
      const result = await setPilotNoShowAction({
        rideId,
        userId: pilot.id,
        noShow,
      });
      notify(result, {
        done: say(noShow ? labels.marked : labels.cleared, pilot.name),
        errors: labels.errors,
      });
    });

  return (
    <DetailList>
      {pilots.map((pilot) => {
        const missing = pilot.attendance === "noShow";
        return (
          <DetailListRow key={pilot.id}>
            <PersonChip
              name={pilot.name}
              avatar={pilot.avatar}
              href={pilot.href}
            />
            <AttendanceBadge
              attendance={pilot.attendance}
              label={labels.attendance[pilot.attendance]}
              className="ml-auto"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={missing}
              aria-label={say(labels.noShowLabel, pilot.name)}
              disabled={pending}
              onClick={() => mark(pilot, !missing)}
              className={cn(
                "h-8 text-2sm text-ink-soft hover:text-ink",
                missing && "bg-canvas-deeper text-ink",
              )}
            >
              <UserX aria-hidden />
              {labels.noShow}
            </Button>
          </DetailListRow>
        );
      })}
    </DetailList>
  );
}
