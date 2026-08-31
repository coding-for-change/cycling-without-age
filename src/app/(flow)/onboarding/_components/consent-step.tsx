"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useCharacter } from "@/components/character";
import { haptics } from "@/lib/native/haptics";
import { requestNotificationPermission } from "@/lib/native/push";
import { cn, fill } from "@/lib/utils";
import type { OnboardingRole } from "@/lib/onboarding";
import type { StepDefaults } from "./step-page";
import { Step, type StepProgress } from "../../_components/step";
import { submitConsent } from "../actions";

type Strings = {
  title: string;
  titlePilot: string;
  safety: string;
  notifications: string;
  data: string;
  imprint: string;
  privacy: string;
  dataSuffix: string;
  required: string;
  error: string;
  joining: string;
};

type Box = "safety" | "notifications" | "data";

export function ConsentStep({
  role,
  progress,
  chapterName,
  defaults,
  strings,
  continueLabel,
}: {
  role: OnboardingRole;
  progress: StepProgress | null;
  chapterName: string | null;
  defaults: StepDefaults;
  strings: Strings;
  continueLabel: string;
}) {
  const router = useRouter();
  const { oops } = useCharacter();

  const [ticked, setTicked] = useState<Record<Box, boolean>>({
    safety: defaults.safety,
    notifications: defaults.notifications,
    data: defaults.consented,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const boxes: Box[] =
    role === "pilot"
      ? ["notifications", "data"]
      : ["safety", "notifications", "data"];

  const complete = boxes.every((box) => ticked[box]);

  const toggle = (box: Box, next: boolean) => {
    haptics.selectionChanged();
    setError(null);
    setTicked((previous) => ({ ...previous, [box]: next }));

    if (box === "notifications" && next) void requestNotificationPermission();
  };

  const submit = () =>
    startTransition(async () => {
      const result = await submitConsent({
        safety: ticked.safety,
        notifications: ticked.notifications,
        data: ticked.data,
      });
      if (!result.ok) {
        haptics.error();
        oops();
        setError(strings.error);
        return;
      }
      haptics.success();
      router.push(result.next, { transitionTypes: ["nav-forward"] });
    });

  const label: Record<Box, ReactNode> = {
    safety: strings.safety,
    notifications: strings.notifications,
    data: (
      <>
        {strings.data}{" "}
        <span className="text-ink-soft">
          <LegalLinks strings={strings} />
        </span>
      </>
    ),
  };

  return (
    <Step
      title={role === "pilot" ? strings.titlePilot : strings.title}
      description={
        chapterName
          ? fill(strings.joining, { chapter: chapterName })
          : undefined
      }
      progress={progress ?? undefined}
      action={
        <>
          {error ? (
            <p
              role="alert"
              className="mb-2 text-center text-sm text-red"
            >
              {error}
            </p>
          ) : (
            !complete && (
              <p className="mb-2 text-center text-sm text-ink-soft">
                {strings.required}
              </p>
            )
          )}
          <Button
            size="lg"
            disabled={!complete || pending}
            onClick={submit}
            className="h-14 w-full rounded-full bg-red text-base text-white shadow-lift hover:bg-red-hover disabled:bg-grey-tint disabled:text-ink-faint disabled:shadow-none"
          >
            {continueLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {boxes.map((box) => (
          <label
            key={box}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-(--r-card) border p-4 transition-colors",
              ticked[box]
                ? "border-transparent bg-mint-tint"
                : "border-line bg-canvas hover:bg-canvas-deep",
            )}
          >
            <Checkbox
              checked={ticked[box]}
              onCheckedChange={(next) => toggle(box, next === true)}
              className="mt-0.5 size-5 rounded-[6px]"
            />
            <span className="text-sm leading-relaxed text-ink">
              {label[box]}
            </span>
          </label>
        ))}
      </div>
    </Step>
  );
}

function LegalLinks({ strings }: { strings: Strings }) {
  const parts = strings.dataSuffix.split(/(\{imprint\}|\{privacy\})/);
  return (
    <>
      {parts.map((part, index) =>
        part === "{imprint}" || part === "{privacy}" ? (
          <a
            key={index}
            href={part === "{imprint}" ? "/legal/imprint" : "/legal/privacy"}
            target="_blank"
            rel="noopener noreferrer"
            // Stop the label's own click handler from toggling the box when the
            // person only wanted to read what they are agreeing to.
            onClick={(event) => event.stopPropagation()}
            className="underline underline-offset-2 hover:text-ink"
          >
            {part === "{imprint}" ? strings.imprint : strings.privacy}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}
