import { CalendarFallback } from "../../_components/calendar/calendar-fallback";
import { MemberPageShell } from "../../_components/member-page";

export default function Loading() {
  return (
    <MemberPageShell>
      <CalendarFallback />
    </MemberPageShell>
  );
}
