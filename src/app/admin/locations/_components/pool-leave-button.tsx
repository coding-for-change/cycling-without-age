"use client";

import { LogOut } from "lucide-react";
import { leavePoolAction } from "@/features/fleet/actions";
import type { Dictionary } from "@/lib/i18n";
import { fill } from "@/lib/utils";
import { ConfirmButton } from "@/components/confirm-button";

export function PoolLeaveButton({
  poolId,
  poolName,
  chapterId,
  chapterName,
  strings,
  errors,
}: {
  poolId: string;
  poolName: string;
  chapterId: string;
  chapterName: string;
  strings: Dictionary["fleet"]["locations"];
  errors: Dictionary["fleet"]["common"]["errors"];
}) {
  const names = { name: poolName, chapter: chapterName };
  return (
    <ConfirmButton
      icon={<LogOut aria-hidden />}
      label={strings.leave.open}
      title={fill(strings.leave.title, names)}
      body={fill(strings.leave.body, names)}
      confirm={strings.leave.submit}
      cancel={strings.cancel}
      destructive
      done={fill(strings.leave.done, names)}
      errors={errors}
      action={() => leavePoolAction({ poolId, chapterId })}
      className="border-line"
    />
  );
}
