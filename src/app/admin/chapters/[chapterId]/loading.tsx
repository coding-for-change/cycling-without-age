import { AdminPageShell } from "../../_components/admin-page";
import {
  CHAPTER_PANELS,
  CHAPTER_SECTIONS,
  DetailSkeleton,
} from "../../_components/detail-skeleton";

export default function Loading() {
  return (
    <AdminPageShell>
      <DetailSkeleton
        panels={CHAPTER_PANELS}
        sections={CHAPTER_SECTIONS}
      />
    </AdminPageShell>
  );
}
