"use client";

import { useRouter } from "next/navigation";
import type { NotifyLabels } from "../../_components/action-feedback";
import {
  ConfirmDeleteDialog,
  type ConfirmDeleteLabels,
} from "../../_components/confirm-delete-dialog";
import { deleteUserAction } from "../actions";

export type DeleteUserLabels = ConfirmDeleteLabels & {
  errors: NotifyLabels["errors"];
};

export function DeleteUserDialog({
  userId,
  name,
  backHref,
  labels,
  cancel,
}: {
  userId: string;
  name: string;
  backHref: string;
  labels: DeleteUserLabels;
  cancel: string;
}) {
  const router = useRouter();

  return (
    <ConfirmDeleteDialog
      name={name}
      labels={labels}
      cancel={cancel}
      errors={labels.errors}
      action={() => deleteUserAction({ userId })}
      onDone={() => router.push(backHref)}
    />
  );
}
