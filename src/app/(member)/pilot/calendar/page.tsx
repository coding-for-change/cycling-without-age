import { Suspense } from "react";
import { first, type SearchParams } from "@/lib/search-params";
import { CalendarFallback } from "../../_components/calendar/calendar-fallback";
import { parseMonth } from "../../_components/calendar/month-grid";
import { MemberPageShell } from "../../_components/member-page";
import { PilotCalendar } from "./_components/pilot-calendar";

export default function PilotCalendarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <MemberPageShell>
      <Suspense fallback={<CalendarFallback />}>
        <PilotCalendarRoute searchParams={searchParams} />
      </Suspense>
    </MemberPageShell>
  );
}

async function PilotCalendarRoute({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const month = parseMonth(first((await searchParams).month));
  return <PilotCalendar month={month} />;
}
