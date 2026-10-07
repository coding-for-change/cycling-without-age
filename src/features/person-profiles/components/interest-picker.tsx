"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOptimisticSave } from "@/components/use-optimistic-save";
import { formatMessage } from "@/lib/i18n/format";
import {
  CUSTOM_INTEREST_MAX_LENGTH,
  CUSTOM_INTERESTS_MAX,
  INTEREST_KEYS,
  INTERESTS_MAX,
  type InterestKey,
} from "../schemas";
import { updatePersonProfileAction } from "../actions";
import { useEditor } from "./editor-context";
import { ToggleChip } from "./toggle-chip";

type Interests = { picked: InterestKey[]; custom: string[] };

export function InterestPicker({ value }: { value: Interests }) {
  const { subject, strings, labels, language } = useEditor();
  const { shown, persist } = useOptimisticSave(
    value,
    (next) =>
      updatePersonProfileAction({
        subject,
        patch: { interests: next.picked, customInterests: next.custom },
      }),
    labels,
  );
  const [draft, setDraft] = useState("");

  const toggle = (key: InterestKey) => {
    const picked = shown.picked.includes(key)
      ? shown.picked.filter((k) => k !== key)
      : [...shown.picked, key];
    void persist({ ...shown, picked }, shown, false);
  };

  const addCustom = () => {
    const label = draft.trim();
    if (!label) return;
    const known = shown.custom.some(
      (c) => c.toLowerCase() === label.toLowerCase(),
    );
    setDraft("");
    if (known) return;
    void persist({ ...shown, custom: [...shown.custom, label] }, shown, false);
  };

  const removeCustom = (label: string) =>
    void persist(
      { ...shown, custom: shown.custom.filter((c) => c !== label) },
      shown,
    );

  const full = shown.picked.length >= INTERESTS_MAX;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-1.25">
        {INTEREST_KEYS.map((key) => {
          const pressed = shown.picked.includes(key);
          return (
            <ToggleChip
              key={key}
              pressed={pressed}
              disabled={!pressed && full}
              onToggle={() => toggle(key)}
            >
              {strings.interests.options[key]}
            </ToggleChip>
          );
        })}
        {shown.custom.map((label) => (
          <span
            key={label}
            className="inline-flex min-h-9 items-center gap-1 rounded-full bg-mint pr-1 pl-3 text-sm"
          >
            {label}
            <button
              type="button"
              onClick={() => removeCustom(label)}
              aria-label={formatMessage(
                strings.interests.remove,
                { interest: label },
                language,
              )}
              className="grid size-7 place-items-center rounded-full outline-none hover:bg-mint-tint focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <X
                aria-hidden
                className="size-3.5"
              />
            </button>
          </span>
        ))}
      </div>

      {shown.custom.length < CUSTOM_INTERESTS_MAX ? (
        <form
          className="flex max-w-sm gap-1.25"
          onSubmit={(event) => {
            event.preventDefault();
            addCustom();
          }}
        >
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={CUSTOM_INTEREST_MAX_LENGTH}
            placeholder={strings.interests.customPlaceholder}
            aria-label={strings.interests.custom}
            className="rounded-full"
          />
          <Button
            type="submit"
            variant="outline"
            className="rounded-full border-line"
            disabled={!draft.trim()}
          >
            <Plus aria-hidden />
            {strings.interests.add}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
