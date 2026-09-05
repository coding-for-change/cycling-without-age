"use client";

import { useEffect, useRef, useState } from "react";
import { PartyPopper } from "lucide-react";
import { acknowledgeApproval } from "@/features/membership/actions";
import { haptics } from "@/lib/native/haptics";
import { Button } from "@/components/ui/button";

export function ApprovalCelebration({
  title,
  body,
  dismiss,
}: {
  title: string;
  body: string;
  dismiss: string;
}) {
  const [shown, setShown] = useState(true);
  const greeted = useRef(false);

  useEffect(() => {
    if (greeted.current) return;
    greeted.current = true;
    haptics.success();
    void acknowledgeApproval();
  }, []);

  if (!shown) return null;

  return (
    <section className="mt-8 flex flex-wrap items-start gap-4 rounded-xl bg-mint-tint p-5 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95">
      <PartyPopper
        className="mt-0.5 size-5 shrink-0 text-mint-deep"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-lg font-bold">{title}</h2>
        <p className="mt-1 text-sm text-ink-soft">{body}</p>
      </div>
      <Button
        variant="outline"
        onClick={() => setShown(false)}
        className="min-h-11 rounded-full border-line bg-canvas"
      >
        {dismiss}
      </Button>
    </section>
  );
}
