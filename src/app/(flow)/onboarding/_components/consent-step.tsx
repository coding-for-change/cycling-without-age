"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useCharacter } from "@/components/character";
import { haptics } from "@/lib/native/haptics";
import { requestNotificationPermission } from "@/lib/native/push";
import { cn } from "@/lib/utils";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import type { OnboardingRole } from "@/lib/onboarding";
import type { StepDefaults } from "./step-page";
import { Step, StepError, type StepProgress } from "../../_components/step";
import { submitConsent } from "../actions";

type Strings = {
  title: string;
  safety: string;
  notifications: string;
  data: string;
  imprint: string;
  privacy: string;
  dataSuffix: string;
  health: string;
  required: string;
  error: string;
  joining: string;
};

type Box = "safety" | "notifications" | "data";

export function ConsentStep({
  role,
  caretaker,
  progress,
  chapterName,
  setUpBy,
  defaults,
  strings,
  continueLabel,
  locale,
}: {
  role: OnboardingRole;
  caretaker: boolean;
  progress: StepProgress | null;
  chapterName: string | null;
  setUpBy: string | null;
  defaults: StepDefaults;
  strings: Strings;
  continueLabel: string;
  locale: Locale;
}) {
  const router = useRouter();
  const { oops } = useCharacter();
  const boxId = useId();

  const [ticked, setTicked] = useState<Record<Box, boolean>>({
    safety: defaults.safety,
    notifications: defaults.notifications,
    data: defaults.consented,
  });
  const [health, setHealth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const boxes: Box[] =
    role === "pilot"
      ? ["notifications", "data"]
      : ["safety", "notifications", "data"];

  const asksHealth = role === "passenger" && !caretaker;
  const agreements = boxes.length + (asksHealth ? 1 : 0);

  const complete = boxes.every((box) => ticked[box]);

  const toggle = (box: Box, next: boolean) => {
    haptics.selectionChanged();
    setError(null);
    setTicked((previous) => ({ ...previous, [box]: next }));

    if (box === "notifications" && next) void requestNotificationPermission();
  };

  const submit = () => {
    if (ticked.notifications) void requestNotificationPermission();
    startTransition(async () => {
      const result = await submitConsent({
        safety: ticked.safety,
        notifications: ticked.notifications,
        data: ticked.data,
        health: asksHealth && health,
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
  };

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
      title={formatMessage(strings.title, { count: agreements }, locale)}
      description={
        setUpBy ??
        (chapterName
          ? formatMessage(strings.joining, { chapter: chapterName }, locale)
          : undefined)
      }
      progress={progress ?? undefined}
      action={
        <>
          {error ? (
            <StepError>{error}</StepError>
          ) : (
            !complete && (
              <p className="mb-2 text-center text-sm text-ink-soft">
                {strings.required}
              </p>
            )
          )}
          <Button
            disabled={!complete || pending}
            onClick={submit}
            variant="brand"
            size="hero"
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
              aria-labelledby={`${boxId}-${box}`}
              className="mt-0.5 size-5 rounded-[6px]"
            />
            <span
              id={`${boxId}-${box}`}
              className="text-sm leading-relaxed text-ink"
            >
              {label[box]}
            </span>
          </label>
        ))}
        {asksHealth ? (
          <label
            className={cn(
              "mt-5 flex cursor-pointer items-start gap-3 rounded-(--r-card) border border-dashed p-4 transition-colors",
              health
                ? "border-transparent bg-mint-tint"
                : "border-line bg-canvas hover:bg-canvas-deep",
            )}
          >
            <Checkbox
              checked={health}
              onCheckedChange={(next) => {
                haptics.selectionChanged();
                setHealth(next === true);
              }}
              aria-labelledby={`${boxId}-health`}
              className="mt-0.5 size-5 rounded-[6px]"
            />
            <span
              id={`${boxId}-health`}
              className="text-sm leading-relaxed text-ink-soft"
            >
              {strings.health}
            </span>
          </label>
        ) : null}
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
