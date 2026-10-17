import { MemberPageShell } from "../../_components/member-page";
import { PilotRidesFallback } from "./_components/pilot-rides-fallback";

export default function Loading() {
  return (
    <MemberPageShell>
      <PilotRidesFallback />
    </MemberPageShell>
  );
}
