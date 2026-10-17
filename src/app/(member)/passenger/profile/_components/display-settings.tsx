"use client";

import { useId } from "react";
import type { InlineFieldLabels } from "@/components/inline-field";
import { ToggleRow } from "@/components/settings-rows";
import { useOptimisticSave } from "@/components/use-optimistic-save";
import { setDisplayPreferencesAction } from "@/features/profile/actions";
import { TEXT_SIZES, type TextSize } from "@/lib/display-preferences";
import { cn } from "@/lib/utils";
import {
  applyMotion,
  applyTextSize,
} from "../../../_components/display/display-cookie-sync";

export type DisplayStrings = {
  textSize: string;
  textSizeHint: string;
  sizes: Record<TextSize, string>;
  sample: string;
  motion: string;
  motionHint: string;
};

const SAMPLE_SIZE: Record<TextSize, string> = {
  normal: "text-lg",
  large: "text-2xl",
  xLarge: "text-3xl",
};

/**
 * The choice shows at once — `<html>` is changed before the server hears of
 * it — and goes back if the save fails, so the page never claims a size the
 * account does not hold.
 */
export function DisplaySettings({
  textSize,
  reduceMotion,
  strings,
  labels,
  showLegend = true,
}: {
  textSize: TextSize;
  reduceMotion: boolean;
  strings: DisplayStrings;
  labels: InlineFieldLabels;
  /** Off where the surrounding section already says "Text size". */
  showLegend?: boolean;
}) {
  const name = useId();
  const hint = useId();
  const size = useOptimisticSave<TextSize>(
    textSize,
    async (next, previous) => {
      applyTextSize(next);
      const result = await setDisplayPreferencesAction({ textSize: next });
      if (!result.ok) applyTextSize(previous);
      return result;
    },
    labels,
  );

  return (
    <div className="flex flex-col gap-5">
      <fieldset
        aria-describedby={hint}
        className="flex flex-col gap-3"
      >
        <legend
          className={cn("text-base font-medium", !showLegend && "sr-only")}
        >
          {strings.textSize}
        </legend>
        <p
          id={hint}
          className="-mt-1 text-sm text-ink-soft"
        >
          {strings.textSizeHint}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {TEXT_SIZES.map((option) => (
            <label
              key={option}
              className={cn(
                "flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1.25 rounded-2xl border px-2 py-3 text-center transition-colors motion-reduce:transition-none has-focus-visible:ring-2 has-focus-visible:ring-ring/50",
                size.shown === option
                  ? "border-mint-deep bg-mint-tint"
                  : "border-line hover:bg-canvas-deep",
              )}
            >
              <input
                type="radio"
                name={name}
                value={option}
                checked={size.shown === option}
                onChange={() => void size.persist(option, size.shown)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn("font-display leading-none", SAMPLE_SIZE[option])}
              >
                Aa
              </span>
              <span className="text-sm">{strings.sizes[option]}</span>
            </label>
          ))}
        </div>
        <p className="rounded-2xl bg-canvas-deep px-4 py-3 text-base">
          {strings.sample}
        </p>
      </fieldset>

      <ul className="rounded-2xl border border-line px-4">
        <ToggleRow
          value={reduceMotion}
          label={strings.motion}
          hint={strings.motionHint}
          labels={labels}
          onSave={async (next) => {
            applyMotion(next);
            const result = await setDisplayPreferencesAction({
              reduceMotion: next,
            });
            if (!result.ok) applyMotion(!next);
            return result;
          }}
        />
      </ul>
    </div>
  );
}
