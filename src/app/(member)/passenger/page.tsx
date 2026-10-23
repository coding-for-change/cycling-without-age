import { Suspense } from "react";
import { ChapterChoice } from "../_components/home/chapter-choice";
import { Greeting } from "../_components/home/greeting";
import { HappeningSoon } from "../_components/home/happening-soon";
import {
  GreetingFallback,
  HappeningSoonFallback,
  HomeHeroFallback,
} from "../_components/home/home-fallback";
import { HomeHero } from "../_components/home/home-hero";
import {
  SetupRow,
  SetupRowFallback,
} from "../_components/home/setup-checklist";
import { MemberPageShell } from "../_components/member-page";

export default function PassengerHomePage() {
  return (
    <MemberPageShell>
      <Suspense fallback={<GreetingFallback />}>
        <Greeting perspective="passenger" />
      </Suspense>
      <Suspense fallback={<HomeHeroFallback />}>
        <HomeHero />
      </Suspense>
      <Suspense fallback={null}>
        <ChapterChoice />
      </Suspense>
      <Suspense fallback={<HappeningSoonFallback />}>
        <HappeningSoon />
      </Suspense>
      <Suspense fallback={<SetupRowFallback />}>
        <SetupRow perspective="passenger" />
      </Suspense>
    </MemberPageShell>
  );
}
