"use client";

import { EntityCombobox } from "@/components/entity-combobox";

export type LocationOption = {
  id: string;
  name: string;
  kind: "chapter" | "pool";
  owner: string;
};

export type LocationPickerLabels = {
  placeholder: string;
  empty: string;
  pool: string;
};

export function LocationPicker({
  locations,
  onChange,
  labels,
  ...rest
}: {
  id: string;
  locations: LocationOption[];
  value: string | null;
  onChange: (locationId: string) => void;
  labels: LocationPickerLabels;
  container?: HTMLElement | null;
  className?: string;
}) {
  return (
    <EntityCombobox
      {...rest}
      items={locations}
      onChange={(next) => {
        if (next) onChange(next);
      }}
      getLabel={(location) => location.name}
      getSearchText={(location) => `${location.name} ${location.owner}`}
      placeholder={labels.placeholder}
      empty={labels.empty}
      renderItem={(location) => (
        <>
          <span className="grid min-w-0 flex-1">
            <span className="truncate">{location.name}</span>
            {location.owner ? (
              <span className="truncate text-xs text-ink-soft">
                {location.owner}
              </span>
            ) : null}
          </span>
          {location.kind === "pool" ? (
            <span className="rounded-full bg-mint-tint px-2 text-xs text-ink">
              {labels.pool}
            </span>
          ) : null}
        </>
      )}
    />
  );
}
