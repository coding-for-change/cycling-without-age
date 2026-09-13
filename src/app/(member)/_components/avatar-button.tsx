"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountSurface } from "@/components/account/account-surface";
import type { AccountData } from "@/components/account/types";
import { PersonAvatar } from "@/components/person-avatar";
import type { Perspective } from "@/lib/access";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";
import { nextPerspective } from "../nav";

/** How long a tap waits to see whether a second one is coming. */
const DOUBLE_TAP_MS = 250;

export function AvatarButton({
  data,
  activePerspective,
  strings,
  className,
}: {
  data: AccountData;
  activePerspective: Perspective;
  strings: { account: string; switchHint: string };
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rotation = nextPerspective(
    data.perspectives.map((option) => option.perspective),
    activePerspective,
  );
  const rotateTo =
    data.perspectives.find((option) => option.perspective === rotation)?.href ??
    null;

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const handleClick = () => {
    if (!rotateTo) {
      setOpen(true);
      return;
    }

    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
      haptics.tap("medium");
      router.push(rotateTo);
      return;
    }

    timer.current = setTimeout(() => {
      timer.current = null;
      setOpen(true);
    }, DOUBLE_TAP_MS);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={strings.account}
        title={
          rotateTo
            ? `${strings.account} · ${strings.switchHint}`
            : strings.account
        }
        className={cn(
          "flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-full outline-none transition-colors hover:bg-canvas-deep focus-visible:ring-[3px] focus-visible:ring-ring/50 active:bg-canvas-deeper motion-reduce:transition-none",
          className,
        )}
      >
        <PersonAvatar svg={data.profile.avatarAnimated} />
      </button>
      <AccountSurface
        data={data}
        activePerspective={activePerspective}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
