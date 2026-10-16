import { Suspense } from "react";
import { MemberPageShell } from "../../../_components/member-page";
import { PassengerRide } from "./_components/passenger-ride";
import { RideFallback } from "./_components/ride-fallback";

export default function PassengerRidePage({
  params,
}: {
  params: Promise<{ rideId: string }>;
}) {
  return (
    <MemberPageShell wide>
      <Suspense fallback={<RideFallback />}>
        <PassengerRide params={params} />
      </Suspense>
    </MemberPageShell>
  );
}
