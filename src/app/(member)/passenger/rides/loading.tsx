import { MemberPageShell } from "../../_components/member-page";
import { RidesFallback } from "./_components/rides-fallback";

export default function Loading() {
  return (
    <MemberPageShell>
      <RidesFallback />
    </MemberPageShell>
  );
}
