import { Suspense } from "react";
import { ChapterCards } from "../_components/home/chapter-cards";
import { Greeting } from "../_components/home/greeting";
import {
  GreetingFallback,
  SectionFallback,
} from "../_components/home/home-fallback";
import { NextRideCard } from "../_components/home/next-ride-card";
import { RideRequestsCard } from "../_components/home/ride-requests-card";
import { UpcomingEventsCard } from "../_components/home/upcoming-events-card";
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
      <Suspense fallback={null}>
        <RideRequestsCard />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <UpcomingEventsCard />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <ChapterCards perspective="passenger" />
      </Suspense>
      <Suspense fallback={null}>
        <SetupChecklist perspective="passenger" />
      </Suspense>
    </MemberPageShell>
  );
}
