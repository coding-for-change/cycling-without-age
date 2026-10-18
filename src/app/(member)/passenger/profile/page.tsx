import { Suspense } from "react";
import { MemberPageShell } from "../../_components/member-page";
import { OwnProfile } from "./_components/own-profile";
import { ProfileFallback } from "./_components/profile-fallback";

export default function PassengerProfilePage() {
  return (
    <MemberPageShell>
      <Suspense fallback={<ProfileFallback />}>
        <OwnProfile />
      </Suspense>
    </MemberPageShell>
  );
}
