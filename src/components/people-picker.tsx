"use client";

import type { ReactNode } from "react";
import { Check, Plus } from "lucide-react";
import { PersonAvatar, PersonChip } from "@/components/person-avatar";
import { PickerPopover } from "@/components/picker-popover";
import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { formatMessage } from "@/lib/i18n/format";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";

export type PersonOption = {
  id: string;
  name: string;
  avatar: string;
  hint?: string;
  disabled?: boolean;
};

export type PeoplePickerStrings = {
  label: string;
  placeholder: string;
  search: string;
  empty: string;
  count: string;
  full: string;
};

const VISIBLE = 3;

export function PeoplePicker({
  options,
  value,
  onChange,
  strings,
  locale,
  max = null,
  disabled = false,
  align = "start",
  className,
}: {
  options: PersonOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  strings: PeoplePickerStrings;
  locale: string;
  max?: number | null;
  disabled?: boolean;
  align?: "start" | "center" | "end";
  className?: string;
}) {
  const byId = new Map(options.map((option) => [option.id, option]));
  const picked = value
    .map((id) => byId.get(id))
    .filter((option): option is PersonOption => Boolean(option));
  const full = max !== null && value.length >= max;
  const counter =
    max !== null
      ? formatMessage(strings.count, { count: value.length, max }, locale)
      : null;

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((current) => current !== id));
      haptics.selectionChanged();
      return;
    }
    if (full) return;
    onChange([...value, id]);
    haptics.selectionChanged();
  };

  const shown = picked.slice(0, VISIBLE);
  const rest = picked.length - shown.length;
  const summary =
    picked.length === 1
      ? picked[0].name
      : picked.length > 1
        ? picked.map((person) => person.name).join(", ")
        : strings.placeholder;

  return (
    <PickerPopover
      items={options}
      keywords={(person) => [person.name, person.hint ?? ""]}
      isDisabled={(person) =>
        Boolean(person.disabled) || (!value.includes(person.id) && full)
      }
      onSelect={(person) => toggle(person.id)}
      closeOnSelect={false}
      search={strings.search}
      empty={strings.empty}
      align={align}
      className="w-(--radix-popover-trigger-width) min-w-64"
      renderItem={(person) => (
        <PersonOptionRow
          person={person}
          selected={value.includes(person.id)}
        />
      )}
      footer={
        full ? (
          <p className="border-t border-line px-3 py-2 text-xs text-ink-soft">
            {formatMessage(strings.full, { max: max ?? 0 }, locale)}
          </p>
        ) : null
      }
    >
      <button
        type="button"
        disabled={disabled}
        aria-label={`${strings.label}: ${summary}${counter ? ` (${counter})` : ""}`}
        className={cn(
          "flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-line px-2.5 text-left text-2sm transition-colors hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-canvas-deep",
          !picked.length && "border-dashed text-ink-soft",
          className,
        )}
      >
        {picked.length ? (
          <AvatarGroup className="shrink-0 -space-x-1.5">
            {shown.map((person) => (
              <PersonAvatar
                key={person.id}
                svg={person.avatar}
                size="sm"
                className="size-5 ring-2 ring-canvas"
              />
            ))}
            {rest > 0 ? (
              <AvatarGroupCount className="size-5 bg-canvas-deeper text-xs text-ink ring-canvas">
                +{rest}
              </AvatarGroupCount>
            ) : null}
          </AvatarGroup>
        ) : (
          <Plus
            aria-hidden
            className="size-4 shrink-0"
          />
        )}
        <span className="min-w-0 flex-1 truncate">{summary}</span>
        {counter ? (
          <span
            className={cn(
              "shrink-0 text-xs text-ink-soft tabular-nums",
              full && "text-ink",
            )}
          >
            {counter}
          </span>
        ) : null}
      </button>
    </PickerPopover>
  );
}

function PersonOptionRow({
  person,
  selected,
}: {
  person: PersonOption;
  selected?: boolean;
}) {
  return (
    <>
      {selected === undefined ? null : (
        <span
          aria-hidden
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded border border-line",
            selected && "border-mint-deep bg-mint-deep text-white",
          )}
        >
          {selected ? <Check className="size-3 text-white" /> : null}
        </span>
      )}
      <PersonChip
        name={person.name}
        avatar={person.avatar}
      />
      {person.hint ? (
        <span className="shrink-0 text-xs text-ink-soft">{person.hint}</span>
      ) : null}
    </>
  );
}

export function PersonPicker({
  options,
  onPick,
  strings,
  align = "end",
  children,
}: {
  options: PersonOption[];
  onPick: (person: PersonOption) => void;
  strings: { search: string; empty: string };
  align?: "start" | "center" | "end";
  children: ReactNode;
}) {
  return (
    <PickerPopover
      items={options}
      keywords={(person) => [person.name, person.hint ?? ""]}
      onSelect={onPick}
      search={strings.search}
      empty={strings.empty}
      align={align}
      renderItem={(person) => <PersonOptionRow person={person} />}
    >
      {children}
    </PickerPopover>
  );
}
