import { MemberPageShell } from "../../_components/member-page";
import { ProfileFallback } from "./_components/profile-fallback";

export default function Loading() {
  return (
    <MemberPageShell>
      <ProfileFallback />
    </MemberPageShell>
  );
}
