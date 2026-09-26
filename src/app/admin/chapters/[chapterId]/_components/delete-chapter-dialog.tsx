"use client";

import { useRouter } from "next/navigation";
import {
  ConfirmDeleteDialog,
  type ConfirmDeleteLabels,
} from "@/components/confirm-delete-dialog";
import { deleteChapterAction } from "../../actions";

export function DeleteChapterDialog({
  chapterId,
  name,
  consequences,
  backHref,
  labels,
  cancel,
}: {
  chapterId: string;
  name: string;
  consequences: string[];
  backHref: string;
  labels: ConfirmDeleteLabels;
  cancel: string;
}) {
  const router = useRouter();

  return (
    <ConfirmDeleteDialog
      name={name}
      consequences={consequences}
      labels={labels}
      cancel={cancel}
      action={() => deleteChapterAction(chapterId)}
      onDone={() => router.push(backHref)}
    />
  );
}
