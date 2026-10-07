import { MemberPageShell } from "../../../_components/member-page";
import { PilotRideFallback } from "./_components/pilot-ride-fallback";

export default function Loading() {
  return (
    <MemberPageShell>
      <PilotRideFallback />
    </MemberPageShell>
  );
}
