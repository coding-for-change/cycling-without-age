"use client";

import type { ReactNode } from "react";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

export function EntityCombobox<T extends { id: string }>({
  id,
  items,
  value,
  onChange,
  getLabel,
  getSearchText = getLabel,
  renderItem,
  placeholder,
  empty,
  clearable = false,
  container,
  className,
}: {
  id: string;
  items: T[];
  value: string | null;
  onChange: (id: string | null) => void;
  getLabel: (item: T) => string;
  getSearchText?: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  placeholder: string;
  empty: string;
  clearable?: boolean;
  container?: HTMLElement | null;
  className?: string;
}) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const ids = items.map((item) => item.id);

  const matches = (itemId: string, query: string) => {
    const term = query.trim().toLowerCase();
    if (term === "") return true;
    const item = byId.get(itemId);
    return item ? getSearchText(item).toLowerCase().includes(term) : false;
  };

  return (
    <Combobox
      items={ids}
      value={value && byId.has(value) ? value : null}
      onValueChange={(next: string | null) => {
        if (next || clearable) onChange(next);
      }}
      itemToStringLabel={(itemId: string) => {
        const item = byId.get(itemId);
        return item ? getLabel(item) : "";
      }}
      filter={matches}
    >
      <ComboboxInput
        id={id}
        autoComplete="off"
        placeholder={placeholder}
        showClear={clearable && value !== null}
        className={cn("h-11 border-line text-base", className)}
      />
      <ComboboxContent container={container ?? undefined}>
        <ComboboxEmpty>{empty}</ComboboxEmpty>
        <ComboboxList>
          <ComboboxCollection>
            {(itemId: string) => (
              <ComboboxItem
                key={itemId}
                value={itemId}
              >
                {renderItem(byId.get(itemId)!)}
              </ComboboxItem>
            )}
          </ComboboxCollection>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
