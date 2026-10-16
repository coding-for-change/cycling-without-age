import { MemberPageShell } from "../../../../_components/member-page";
import { RequestDetailFallback } from "./_components/request-detail-fallback";

export default function Loading() {
  return (
    <MemberPageShell>
      <RequestDetailFallback />
    </MemberPageShell>
  );
}
