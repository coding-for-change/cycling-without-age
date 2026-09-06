"use client";

import { useRouter } from "next/navigation";
import { fill } from "@/lib/utils";
import type { NotifyLabels } from "../../../_components/action-feedback";
import {
  ConfirmDeleteDialog,
  type ConfirmDeleteLabels,
} from "../../../_components/confirm-delete-dialog";
import { deleteChapterAction } from "../../actions";

export type DeleteChapterLabels = ConfirmDeleteLabels & {
  footprint: string;
  errors: NotifyLabels["errors"];
};

export function DeleteChapterDialog({
  chapterId,
  name,
  footprint,
  backHref,
  labels,
  cancel,
}: {
  chapterId: string;
  name: string;
  footprint: {
    members: number;
    passengers: number;
    pendingApplications: number;
  };
  backHref: string;
  labels: DeleteChapterLabels;
  cancel: string;
}) {
  const router = useRouter();

  return (
    <ConfirmDeleteDialog
      name={name}
      footprint={fill(labels.footprint, {
        members: footprint.members,
        passengers: footprint.passengers,
        pending: footprint.pendingApplications,
      })}
      labels={labels}
      cancel={cancel}
      errors={labels.errors}
      action={() => deleteChapterAction(chapterId)}
      onDone={() => router.push(backHref)}
    />
  );
}
