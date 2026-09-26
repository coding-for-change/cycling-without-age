"use client";

import { useRouter } from "next/navigation";
import {
  ConfirmDeleteDialog,
  type ConfirmDeleteLabels,
} from "@/components/confirm-delete-dialog";
import type { Locale } from "@/lib/i18n/locales";
import { deleteUserAction } from "../actions";

export type DeleteUserLabels = ConfirmDeleteLabels;

export function DeleteUserDialog({
  userId,
  name,
  backHref,
  labels,
  cancel,
  locale,
}: {
  userId: string;
  name: string;
  backHref: string;
  labels: DeleteUserLabels;
  cancel: string;
  locale: Locale;
}) {
  const router = useRouter();

  return (
    <ConfirmDeleteDialog
      name={name}
      locale={locale}
      labels={labels}
      cancel={cancel}
      action={() => deleteUserAction({ userId })}
      onDone={() => router.push(backHref)}
    />
  );
}
