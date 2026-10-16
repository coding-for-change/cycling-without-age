import { AdminPageShell } from "../../_components/admin-page";
import { RideTabsSkeleton } from "../_components/rides-skeleton";
import {
  RequestRowsSkeleton,
  RequestsHeaderSkeleton,
} from "./_components/requests-skeleton";

export default function Loading() {
  return (
    <AdminPageShell>
      <RequestsHeaderSkeleton />
      <RideTabsSkeleton />
      <RequestRowsSkeleton />
    </AdminPageShell>
  );
}
