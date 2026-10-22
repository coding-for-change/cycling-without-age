import { Suspense } from "react";
import { first, type SearchParams } from "@/lib/search-params";
import { CalendarFallback } from "../../_components/calendar/calendar-fallback";
import { parseMonth } from "../../_components/calendar/month-grid";
import { MemberPageShell } from "../../_components/member-page";
import { PassengerCalendar } from "./_components/passenger-calendar";

export default function PassengerCalendarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <MemberPageShell>
      <Suspense fallback={<CalendarFallback />}>
        <PassengerCalendarRoute searchParams={searchParams} />
      </Suspense>
    </MemberPageShell>
  );
}

async function PassengerCalendarRoute({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const month = parseMonth(first((await searchParams).month));
  return <PassengerCalendar month={month} />;
}
