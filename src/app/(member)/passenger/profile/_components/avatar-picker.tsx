"use client";

import { useState, useTransition } from "react";
import { RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { PersonAvatar } from "@/components/person-avatar";
import { Button } from "@/components/ui/button";
import {
  setAvatarAction,
  suggestAvatarsAction,
  type AvatarSuggestion,
} from "@/features/profile/actions";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";

export type AvatarStrings = {
  current: string;
  pick: string;
  more: string;
  reset: string;
  saved: string;
  failed: string;
  photoFirst: string;
};

export function AvatarPicker({
  current,
  original,
  picked,
  hasPhoto,
  suggestions,
  strings,
}: {
  current: string;
  original: string;
  picked: boolean;
  /** A photo is drawn instead of the character wherever there is one. */
  hasPhoto: boolean;
  suggestions: AvatarSuggestion[];
  strings: AvatarStrings;
}) {
  const [shown, setShown] = useState({ svg: current, picked });
  const [options, setOptions] = useState(suggestions);
  const [pending, start] = useTransition();

  const choose = (seed: string | null, svg: string) =>
    start(async () => {
      haptics.tap();
      const result = await setAvatarAction(seed);
      if (!result.ok) {
        toast.error(strings.failed);
        haptics.error();
        return;
      }
      setShown({ svg, picked: seed !== null });
      toast.success(strings.saved);
      haptics.success();
    });

  const more = () =>
    start(async () => {
      const next = await suggestAvatarsAction();
      if (next.length) setOptions(next);
      else toast.error(strings.failed);
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <PersonAvatar
          svg={shown.svg}
          className="size-20"
        />
        <p className="text-sm text-ink-soft">{strings.current}</p>
      </div>
      {hasPhoto ? (
        <p className="rounded-2xl bg-mint-tint p-4 text-sm">
          {strings.photoFirst}
        </p>
      ) : null}

      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {options.map((option, index) => (
          <li key={option.seed}>
            <button
              type="button"
              disabled={pending}
              aria-label={`${strings.pick} ${index + 1}`}
              onClick={() => choose(option.seed, option.svg)}
              className={cn(
                "flex aspect-square w-full items-center justify-center rounded-2xl border border-line p-2 outline-none transition-colors hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60 motion-reduce:transition-none",
                shown.svg === option.svg && "border-mint-deep bg-mint-tint",
              )}
            >
              <PersonAvatar
                svg={option.svg}
                className="size-full"
              />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={more}
          className="min-h-11 rounded-full border-line"
        >
          <RefreshCw aria-hidden />
          {strings.more}
        </Button>
        {shown.picked ? (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => choose(null, original)}
            className="min-h-11 rounded-full"
          >
            <RotateCcw aria-hidden />
            {strings.reset}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
