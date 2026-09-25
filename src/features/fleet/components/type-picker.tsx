"use client";

import { Accessibility } from "lucide-react";
import { EntityCombobox } from "@/components/entity-combobox";

export type TypeOption = {
  id: string;
  name: string;
  seats: string;
  wheelchairAccessible: boolean;
  scope: string;
};

export type TypePickerLabels = {
  placeholder: string;
  empty: string;
  wheelchair: string;
};

export function TypePicker({
  types,
  labels,
  ...rest
}: {
  id: string;
  types: TypeOption[];
  value: string | null;
  onChange: (typeId: string | null) => void;
  labels: TypePickerLabels;
  container?: HTMLElement | null;
  className?: string;
}) {
  return (
    <EntityCombobox
      {...rest}
      items={types}
      getLabel={(type) => type.name}
      placeholder={labels.placeholder}
      empty={labels.empty}
      clearable
      renderItem={(type) => (
        <>
          <span className="min-w-0 flex-1 truncate">{type.name}</span>
          {type.wheelchairAccessible ? (
            <Accessibility
              aria-label={labels.wheelchair}
              className="text-ink-soft"
            />
          ) : null}
          <span className="text-xs text-ink-soft">{type.seats}</span>
          <span className="text-xs text-ink-faint">{type.scope}</span>
        </>
      )}
    />
  );
}
