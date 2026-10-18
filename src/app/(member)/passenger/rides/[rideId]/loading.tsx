import { MemberPageShell } from "../../../_components/member-page";
import { RideDetailFallback } from "./_components/ride-detail-fallback";

export default function Loading() {
  return (
    <MemberPageShell>
      <RideDetailFallback />
    </MemberPageShell>
  );
}
