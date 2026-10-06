"use client";

import { useId } from "react";
import { Accessibility, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FileThumb } from "@/features/fleet/components/file-image";
import { trishawMeta } from "@/features/rides/components/ride-presentation";
import type { TrishawOption } from "@/features/rides/components/trishaw-options";
import { cn } from "@/lib/utils";

export type TrishawOptionLabels = {
  pool: string;
  wheelchair: string;
  damaged: string;
};

export function TrishawOptionRow({
  option,
  checked,
  onCheckedChange,
  labels,
  radioGroup,
}: {
  option: TrishawOption;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  labels: TrishawOptionLabels;
  radioGroup?: string;
}) {
  const id = useId();
  const disabled = option.blocked !== null && !checked;
  const note = checked ? option.warning : (option.blocked ?? option.warning);

  return (
    <li>
      <label
        htmlFor={id}
        className={cn(
          "flex min-h-16 items-center gap-3 rounded-lg px-2 py-2 transition-colors motion-reduce:transition-none",
          disabled
            ? "cursor-not-allowed opacity-60"
            : "hover:bg-canvas-deep cursor-pointer",
          checked && "bg-mint-tint hover:bg-mint-tint",
        )}
      >
        {radioGroup ? (
          <span className="relative grid size-5 shrink-0 place-items-center">
            <input
              id={id}
              type="radio"
              name={radioGroup}
              value={option.id}
              checked={checked}
              disabled={disabled}
              onChange={() => onCheckedChange(true)}
              onClick={() => {
                if (checked) onCheckedChange(false);
              }}
              className="peer border-line checked:border-mint-deep focus-visible:ring-ring/50 size-5 cursor-pointer appearance-none disabled:cursor-not-allowed rounded-full border shadow-xs transition-colors outline-none focus-visible:ring-2 motion-reduce:transition-none"
            />
            <span
              aria-hidden
              className="bg-mint-deep pointer-events-none absolute size-2.5 scale-0 rounded-full transition-transform peer-checked:scale-100 motion-reduce:transition-none"
            />
          </span>
        ) : (
          <Checkbox
            id={id}
            checked={checked}
            disabled={disabled}
            onCheckedChange={(next) => onCheckedChange(next === true)}
            className="border-line data-[state=checked]:border-mint-deep data-[state=checked]:bg-mint-deep size-5"
          />
        )}
        <FileThumb
          fileId={option.photoFileId}
          alt=""
          size="md"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-medium">{option.name}</span>
            {option.isPool ? (
              <Badge
                variant="outline"
                className="border-line text-ink-soft"
              >
                {labels.pool}
              </Badge>
            ) : null}
            {option.damaged ? (
              <Badge
                variant="outline"
                className="border-line text-ink-soft"
              >
                {labels.damaged}
              </Badge>
            ) : null}
          </span>
          <span className="text-2sm text-ink-soft flex flex-wrap items-center gap-x-1.25">
            {trishawMeta(option)}
            {option.wheelchair ? (
              <span className="inline-flex items-center gap-1">
                <span aria-hidden>·</span>
                <Accessibility
                  aria-hidden
                  className="size-3.5"
                />
                <span className="sr-only">{labels.wheelchair}</span>
              </span>
            ) : null}
          </span>
          {note ? (
            <span className="text-2sm text-ink flex items-center gap-1.25">
              <TriangleAlert
                aria-hidden
                className={cn(
                  "size-3.5 shrink-0",
                  checked && option.warning ? "text-red" : "text-ink-soft",
                )}
              />
              {note}
            </span>
          ) : null}
        </span>
      </label>
    </li>
  );
}
