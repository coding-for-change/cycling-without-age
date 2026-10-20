import { Suspense } from "react";
import { MemberPageShell } from "../../../../_components/member-page";
import { RequestDetail } from "./_components/request-detail";
import { RequestDetailFallback } from "./_components/request-detail-fallback";

export default function RideRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  return (
    <MemberPageShell>
      <Suspense fallback={<RequestDetailFallback />}>
        <RequestDetail params={params} />
      </Suspense>
    </MemberPageShell>
  );
}
