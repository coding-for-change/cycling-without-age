import { AdminPageShell } from "../_components/admin-page";
import {
  CourseRowsSkeleton,
  TrainingHeaderSkeleton,
} from "./_components/training-skeleton";

export default function Loading() {
  return (
    <AdminPageShell>
      <TrainingHeaderSkeleton action />
      <CourseRowsSkeleton />
    </AdminPageShell>
  );
}
