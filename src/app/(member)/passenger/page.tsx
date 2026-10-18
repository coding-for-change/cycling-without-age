import { Suspense } from "react";
import { ChapterCards } from "../_components/home/chapter-cards";
import { ChapterEvents } from "../_components/home/chapter-events";
import { Greeting } from "../_components/home/greeting";
import {
  GreetingFallback,
  EventsFallback,
  SectionFallback,
  TilesFallback,
} from "../_components/home/home-fallback";
import { NextRideCard } from "../_components/home/next-ride-card";
import { ReportProblemCard } from "../_components/home/report-problem-card";
import { RideTotals } from "../_components/home/ride-totals";
import { SetupChecklist } from "../_components/home/setup-checklist";
import { MemberPageShell } from "../_components/member-page";

export default function PassengerHomePage() {
  return (
    <MemberPageShell>
      <Suspense fallback={<GreetingFallback />}>
        <Greeting perspective="passenger" />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <NextRideCard perspective="passenger" />
      </Suspense>
      <Suspense fallback={<TilesFallback />}>
        <RideTotals />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <ChapterCards perspective="passenger" />
      </Suspense>
      <Suspense fallback={<EventsFallback />}>
        <ChapterEvents />
      </Suspense>
      <Suspense fallback={null}>
        <SetupChecklist perspective="passenger" />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <ReportProblemCard />
      </Suspense>
    </MemberPageShell>
  );
}
