import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  AssignmentAttendanceName,
  RosterAttendanceName,
} from "../schemas";

type Attendance = RosterAttendanceName | AssignmentAttendanceName;

const TONE: Record<Attendance, string> = {
  booked: "border-line text-ink-soft",
  signedUp: "border-line text-ink-soft",
  checkedIn: "border-transparent bg-mint text-ink",
  completed: "border-transparent bg-mint text-ink",
  noShow: "border-transparent bg-canvas-deeper text-ink-soft",
  cancelled: "border-transparent bg-canvas-deeper text-ink-soft",
};

/** Where someone stands on a ride, in the same chip on every surface. */
export function AttendanceBadge({
  attendance,
  label,
  className,
}: {
  attendance: Attendance;
  label: string;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(TONE[attendance], className)}
    >
      {label}
    </Badge>
  );
}
