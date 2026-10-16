import { MemberPageShell } from "../../../_components/member-page";
import { RequestFormFallback } from "./_components/request-form-fallback";

export default function Loading() {
  return (
    <MemberPageShell>
      <RequestFormFallback />
    </MemberPageShell>
  );
}
