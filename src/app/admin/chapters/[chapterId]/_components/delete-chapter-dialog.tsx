"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locales";
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
  locale,
}: {
  chapterId: string;
  name: string;
  consequences: string[];
  backHref: string;
  labels: ConfirmDeleteLabels;
  cancel: string;
  locale: Locale;
}) {
  const router = useRouter();

  return (
    <ConfirmDeleteDialog
      name={name}
      locale={locale}
      consequences={consequences}
      labels={labels}
      cancel={cancel}
      action={() => deleteChapterAction(chapterId)}
      onDone={() => router.push(backHref)}
    />
  );
}
