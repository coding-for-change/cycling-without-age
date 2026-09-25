"use client";

import { useRouter } from "next/navigation";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import {
  ConfirmDeleteDialog,
  type ConfirmDeleteLabels,
} from "@/components/confirm-delete-dialog";
import { deleteChapterAction } from "../../actions";

export type DeleteChapterLabels = ConfirmDeleteLabels & { footprint: string };

export function DeleteChapterDialog({
  chapterId,
  name,
  footprint,
  backHref,
  labels,
  cancel,
  locale,
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
  locale: Locale;
}) {
  const router = useRouter();

  return (
    <ConfirmDeleteDialog
      name={name}
      locale={locale}
      footprint={formatMessage(
        labels.footprint,
        {
          members: footprint.members,
          passengers: footprint.passengers,
          pending: footprint.pendingApplications,
        },
        locale,
      )}
      labels={labels}
      cancel={cancel}
      action={() => deleteChapterAction(chapterId)}
      onDone={() => router.push(backHref)}
    />
  );
}
