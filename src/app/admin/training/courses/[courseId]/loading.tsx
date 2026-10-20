import { AdminPageShell } from "../../../_components/admin-page";
import { CourseDetailSkeleton } from "./_components/course-skeleton";

export default function Loading() {
  return (
    <AdminPageShell>
      <CourseDetailSkeleton />
    </AdminPageShell>
  );
}
