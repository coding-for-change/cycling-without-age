import { Suspense } from "react";
import { MemberPageShell } from "../../_components/member-page";
import { PassengerRides } from "./_components/passenger-rides";
import { RidesFallback } from "./_components/rides-fallback";

export default function PassengerRidesPage() {
  return (
    <MemberPageShell>
      <Suspense fallback={<RidesFallback />}>
        <PassengerRides />
      </Suspense>
    </MemberPageShell>
  );
}
