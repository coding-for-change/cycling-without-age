import { Suspense } from "react";
import { MemberPageShell } from "../../../_components/member-page";
import { PilotRide } from "./_components/pilot-ride";
import { PilotRideFallback } from "./_components/pilot-ride-fallback";

export default function PilotRidePage({
  params,
}: {
  params: Promise<{ rideId: string }>;
}) {
  return (
    <MemberPageShell>
      <Suspense fallback={<PilotRideFallback />}>
        <PilotRide params={params} />
      </Suspense>
    </MemberPageShell>
  );
}
