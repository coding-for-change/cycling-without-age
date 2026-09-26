import { MemberPageShell } from "../../../../_components/member-page";
import { FinishFallback } from "./_components/finish-fallback";

export default function Loading() {
  return (
    <MemberPageShell>
      <FinishFallback />
    </MemberPageShell>
  );
}
