"use client";

import { useId, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { InlineFieldLabels } from "@/components/inline-field";
import { useOptimisticSave } from "@/components/use-optimistic-save";
import {
  regeneratePoolCodeAction,
  updateLocationAction,
} from "@/features/fleet/actions";
import type { Dictionary } from "@/lib/i18n";
import { haptics } from "@/lib/native/haptics";
import { fill } from "@/lib/utils";

type Strings = Dictionary["fleet"]["locations"];

export function PoolCode({
  poolId,
  code,
  strings,
  errors,
}: {
  poolId: string;
  code: string | null;
  strings: Strings;
  errors: Dictionary["fleet"]["common"]["errors"];
}) {
  const [pending, startTransition] = useTransition();

  const regenerate = () =>
    startTransition(async () => {
      const result = await regeneratePoolCodeAction(poolId);
      if (!result.ok) {
        haptics.error();
        toast.error(errors[result.error]);
        return;
      }
      haptics.success();
      toast.success(fill(strings.code.regenerated, { code: result.code }));
    });

  return (
    <div className="grid gap-2">
      <span className="text-2sm text-ink-soft">{strings.code.label}</span>
      <p className="font-mono text-lg tracking-wider text-ink">{code}</p>
      <div className="flex flex-wrap gap-1.25">
        {code ? (
          <CopyButton
            value={code}
            label={strings.code.copy}
            copiedLabel={strings.code.copied}
            className="h-9 min-h-9 border-line text-2sm"
          />
        ) : null}
        <Button
          variant="outline"
          disabled={pending}
          onClick={regenerate}
          className="h-9 border-line text-2sm"
        >
          <RefreshCw
            aria-hidden
            className={
              pending ? "animate-spin motion-reduce:animate-none" : undefined
            }
          />
          {strings.code.regenerate}
        </Button>
      </div>
      <p className="text-2sm text-ink-soft">{strings.code.hint}</p>
    </div>
  );
}

export function PoolManageToggle({
  poolId,
  value,
  strings,
  labels,
}: {
  poolId: string;
  value: boolean;
  strings: Strings;
  labels: InlineFieldLabels;
}) {
  const id = useId();
  const { shown, persist } = useOptimisticSave(
    value,
    (next) => updateLocationAction(poolId, { membersMayManage: next }),
    labels,
  );

  return (
    <div className="flex items-start justify-between gap-3">
      <label
        htmlFor={id}
        className="grid gap-1"
      >
        <span className="text-2sm font-medium">
          {strings.membersMayManage.label}
        </span>
        <span className="text-2sm text-ink-soft">
          {strings.membersMayManage.hint}
        </span>
      </label>
      <Switch
        id={id}
        checked={shown}
        onCheckedChange={(next) => void persist(next, !next)}
        className="mt-0.5"
      />
    </div>
  );
}
