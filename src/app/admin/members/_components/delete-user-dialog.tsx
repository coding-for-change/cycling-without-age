"use client";

import { useRouter } from "next/navigation";
import {
  ConfirmDeleteDialog,
  type ConfirmDeleteLabels,
} from "@/components/confirm-delete-dialog";
import { deleteUserAction } from "../actions";

export type DeleteUserLabels = ConfirmDeleteLabels;

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
      action={() => deleteUserAction({ userId })}
      onDone={() => router.push(backHref)}
    />
  );
}
