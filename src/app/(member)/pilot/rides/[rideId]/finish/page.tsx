import { Suspense } from "react";
import { MemberPageShell } from "../../../../_components/member-page";
import { FinishFallback } from "./_components/finish-fallback";
import { FinishRide } from "./_components/finish-ride";

export default function FinishRidePage({
  params,
}: {
  params: Promise<{ rideId: string }>;
}) {
  return (
    <MemberPageShell>
      <Suspense fallback={<FinishFallback />}>
        <FinishRide params={params} />
      </Suspense>
    </MemberPageShell>
  );
}
