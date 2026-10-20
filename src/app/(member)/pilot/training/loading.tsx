import { MemberPageShell } from "../../_components/member-page";
import { TrainingHomeSkeleton } from "./_components/skeletons";

export default function Loading() {
  return (
    <MemberPageShell wide>
      <TrainingHomeSkeleton />
    </MemberPageShell>
  );
}
