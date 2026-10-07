import { Suspense } from "react";
import { MemberPageShell } from "../../../_components/member-page";
import { RideDetail } from "./_components/ride-detail";
import { RideDetailFallback } from "./_components/ride-detail-fallback";

export default function PassengerRidePage({
  params,
}: {
  params: Promise<{ rideId: string }>;
}) {
  return (
    <MemberPageShell>
      <Suspense fallback={<RideDetailFallback />}>
        <RideDetail params={params} />
      </Suspense>
    </MemberPageShell>
  );
}
