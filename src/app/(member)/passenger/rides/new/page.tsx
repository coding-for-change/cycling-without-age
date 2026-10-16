import { Suspense } from "react";
import { MemberPageShell } from "../../../_components/member-page";
import { RequestFormFallback } from "./_components/request-form-fallback";
import { NewRideRequest } from "./_components/new-ride-request";

export default function NewRideRequestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <MemberPageShell>
      <Suspense fallback={<RequestFormFallback />}>
        <NewRideRequest searchParams={searchParams} />
      </Suspense>
    </MemberPageShell>
  );
}
