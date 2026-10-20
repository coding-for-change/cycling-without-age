import { MemberPageShell } from "../../../_components/member-page";
import { CourseOverviewSkeleton } from "../_components/skeletons";

export default function Loading() {
  return (
    <MemberPageShell wide>
      <CourseOverviewSkeleton />
    </MemberPageShell>
  );
}
