import { MemberPageShell } from "../../../_components/member-page";
import { RideFallback } from "./_components/ride-fallback";

export default function Loading() {
  return (
    <MemberPageShell wide>
      <RideFallback />
    </MemberPageShell>
  );
}
