"use client";

import { useId, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useOptimisticSave } from "@/components/use-optimistic-save";
import { formatMessage } from "@/lib/i18n/format";
import { haptics } from "@/lib/native/haptics";
import {
  ACCESSIBILITY_GROUPS,
  type AccessibilityGroup,
  type AccessibilityTag,
} from "../schemas";
import {
  grantHealthConsentAction,
  setAccessibilityAction,
  withdrawHealthConsentAction,
} from "../actions";
import { ACCESSIBILITY_ICONS } from "./accessibility-icons";
import { useEditor } from "./editor-context";
import { ToggleChip } from "./toggle-chip";

type Needs = { tags: AccessibilityTag[]; none: boolean };

export function AccessibilityPicker({
  value,
  consent,
  canConsent,
}: {
  value: Needs;
  consent: boolean;
  canConsent: boolean;
}) {
  const { subject, name, onBehalf, strings, labels, language } = useEditor();
  const text = strings.accessibility;
  const attestId = useId();
  const [attested, setAttested] = useState(false);
  const [pending, setPending] = useState(false);
  const [asking, setAsking] = useState<AccessibilityTag | null>(null);
  const { shown, persist } = useOptimisticSave(
    value,
    (next) =>
      setAccessibilityAction({
        subject,
        accessibility: next.none
          ? { none: true }
          : { none: false, tags: next.tags },
      }),
    labels,
  );

  const toggle = (tag: AccessibilityTag) => {
    if (!consent) {
      if (!canConsent) return;
      setAttested(false);
      setAsking(tag);
      return;
    }
    const tags = shown.tags.includes(tag)
      ? shown.tags.filter((t) => t !== tag)
      : [...shown.tags, tag];
    void persist({ tags, none: false }, shown, false);
  };

  const run = async (
    action: () => Promise<{ ok: boolean; error?: string }>,
    done?: string,
  ) => {
    setPending(true);
    const result = await action();
    setPending(false);
    if (!result.ok) {
      toast.error(strings.errors.generic);
      haptics.error();
      return false;
    }
    if (done) toast.success(done);
    haptics.success();
    return true;
  };

  const agree = async () => {
    const tag = asking;
    const granted = await run(() =>
      grantHealthConsentAction({ subject, attest: true }),
    );
    if (!granted) return;
    setAsking(null);
    if (tag)
      void persist({ tags: [...shown.tags, tag], none: false }, shown, false);
  };

  const noneChip = (
    <ToggleChip
      pressed={shown.none}
      onToggle={() =>
        void persist({ tags: [], none: !shown.none }, shown, false)
      }
    >
      {text.none}
    </ToggleChip>
  );

  return (
    <div className="grid gap-4">
      {consent || canConsent
        ? (Object.keys(ACCESSIBILITY_GROUPS) as AccessibilityGroup[]).map(
            (group) => (
              <div
                key={group}
                className="grid gap-2"
              >
                <p className="text-xs font-medium text-ink-soft">
                  {text.groups[group]}
                </p>
                <div className="flex flex-wrap gap-1.25">
                  {ACCESSIBILITY_GROUPS[group].map((tag) => {
                    const Icon = ACCESSIBILITY_ICONS[tag];
                    return (
                      <ToggleChip
                        key={tag}
                        pressed={consent && shown.tags.includes(tag)}
                        onToggle={() => toggle(tag)}
                      >
                        <Icon
                          aria-hidden
                          className="size-4"
                        />
                        {text.tags[tag]}
                      </ToggleChip>
                    );
                  })}
                </div>
              </div>
            ),
          )
        : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {noneChip}
        {consent && canConsent ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full text-ink-soft"
            disabled={pending}
            onClick={() =>
              void run(
                () => withdrawHealthConsentAction({ subject }),
                text.withdrawn,
              )
            }
          >
            {text.withdraw}
          </Button>
        ) : null}
      </div>

      <AlertDialog
        open={asking !== null}
        onOpenChange={(open) => {
          if (!open) setAsking(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-mint-tint">
              <ShieldCheck aria-hidden />
            </AlertDialogMedia>
            <AlertDialogTitle>{text.consentTitle}</AlertDialogTitle>
            <AlertDialogDescription>{text.consentBody}</AlertDialogDescription>
          </AlertDialogHeader>
          {onBehalf ? (
            <label
              htmlFor={attestId}
              className="flex items-start gap-2.75 text-left text-sm"
            >
              <Checkbox
                id={attestId}
                checked={attested}
                onCheckedChange={(next) => setAttested(next === true)}
                className="mt-0.5"
              />
              {formatMessage(text.attest, { name }, language)}
            </label>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {strings.photo.cancel}
            </AlertDialogCancel>
            <Button
              type="button"
              disabled={pending || (onBehalf && !attested)}
              onClick={() => void agree()}
            >
              {text.consentAgree}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
