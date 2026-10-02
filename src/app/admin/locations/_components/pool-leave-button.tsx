"use client";

import { LogOut } from "lucide-react";
import { leavePoolAction } from "@/features/fleet/actions";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { ConfirmButton } from "@/components/confirm-button";

export function PoolLeaveButton({
  poolId,
  poolName,
  chapterId,
  chapterName,
  strings,
  errors,
  locale,
}: {
  poolId: string;
  poolName: string;
  chapterId: string;
  chapterName: string;
  strings: Dictionary["fleet"]["locations"];
  errors: Dictionary["fleet"]["common"]["errors"];
  locale: Locale;
}) {
  const names = { name: poolName, chapter: chapterName };
  return (
    <ConfirmButton
      icon={<LogOut aria-hidden />}
      label={strings.leave.open}
      title={formatMessage(strings.leave.title, names, locale)}
      body={formatMessage(strings.leave.body, names, locale)}
      confirm={strings.leave.submit}
      cancel={strings.cancel}
      destructive
      done={formatMessage(strings.leave.done, names, locale)}
      errors={errors}
      action={() => leavePoolAction({ poolId, chapterId })}
      className="border-line"
    />
  );
}
