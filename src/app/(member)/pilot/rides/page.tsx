import { Suspense } from "react";
import { MemberPageShell } from "../../_components/member-page";
import { PilotRides } from "./_components/pilot-rides";
import { PilotRidesFallback } from "./_components/pilot-rides-fallback";

export default function PilotRidesPage() {
  return (
    <MemberPageShell>
      <Suspense fallback={<PilotRidesFallback />}>
        <PilotRides />
      </Suspense>
    </MemberPageShell>
  );
}
