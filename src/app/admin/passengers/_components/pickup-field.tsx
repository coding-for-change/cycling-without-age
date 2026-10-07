"use client";

import { useMemo, useState } from "react";
import { Building2, Loader2, MapPin } from "lucide-react";
import { AddressSearch } from "@/components/address-search";
import { resolveAddress, suggestAddresses } from "@/features/profile/actions";
import { haptics } from "@/lib/native/haptics";
import { Segmented } from "../../_components/segmented";

export type PickupHome = {
  address: string;
  latitude: number;
  longitude: number;
};

export type PickupValue =
  { residence: "careHome" } | { residence: "home"; home: PickupHome | null };

export type PickupStrings = {
  label: string;
  careHome: string;
  home: string;
  change: string;
  missing: string;
  address: {
    label: string;
    placeholder: string;
    hint: string;
    searching: string;
    noResults: string;
  };
};

export const pickupPayload = (value: PickupValue) =>
  value.residence === "careHome"
    ? { residence: "careHome" as const }
    : value.home
      ? { residence: "home" as const, ...value.home }
      : null;

export function PickupField({
  value,
  onChange,
  strings,
  invalid,
  language,
}: {
  value: PickupValue;
  onChange: (value: PickupValue) => void;
  strings: PickupStrings;
  invalid: boolean;
  language: string;
}) {
  const sessionToken = useMemo(() => crypto.randomUUID(), []);
  const [resolving, setResolving] = useState(false);

  const pick = (mapboxId: string) => {
    setResolving(true);
    void resolveAddress({ mapboxId, sessionToken }).then((home) => {
      setResolving(false);
      if (!home) {
        haptics.error();
        return;
      }
      onChange({ residence: "home", home });
    });
  };

  return (
    <fieldset className="grid gap-3">
      <legend className="mb-2 text-sm font-medium">{strings.label}</legend>
      <Segmented
        wide
        label={strings.label}
        value={value.residence}
        options={[
          { value: "careHome", label: strings.careHome, icon: Building2 },
          { value: "home", label: strings.home, icon: MapPin },
        ]}
        onChange={(residence) =>
          onChange(
            residence === "careHome"
              ? { residence }
              : { residence, home: null },
          )
        }
      />
      {value.residence === "home" ? (
        resolving ? (
          <p className="flex h-11 items-center gap-2 px-1 text-sm text-ink-soft">
            <Loader2
              aria-hidden
              className="size-4 animate-spin motion-reduce:animate-none"
            />
            {strings.address.searching}
          </p>
        ) : value.home ? (
          <button
            type="button"
            onClick={() => onChange({ residence: "home", home: null })}
            className="flex w-full items-start gap-3 rounded-lg border border-line bg-canvas px-3 py-2 text-left transition-colors hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
          >
            <MapPin
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-ink-soft"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">
                {value.home.address}
              </span>
              <span className="block text-2sm text-ink-soft">
                {strings.change}
              </span>
            </span>
          </button>
        ) : (
          <div className="grid gap-1">
            <AddressSearch
              search={(query) =>
                suggestAddresses({ query, sessionToken, language })
              }
              strings={strings.address}
              onPick={(suggestion) => pick(suggestion.id)}
            />
            {invalid ? (
              <p
                role="alert"
                className="text-sm text-red-ink"
              >
                {strings.missing}
              </p>
            ) : null}
          </div>
        )
      ) : null}
    </fieldset>
  );
}
