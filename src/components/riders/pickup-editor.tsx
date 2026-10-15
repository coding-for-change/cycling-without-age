"use client";

import { useMemo, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { AddressSearch } from "@/components/address-search";
import type { ActionResult, SaveLabels } from "@/components/action-feedback";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useOptimisticSave } from "@/components/use-optimistic-save";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";
import type { AddressLookup, RiderCardStrings } from "./rider-card";

type Residence = "careHome" | "home";

export type PickupValue = {
  residence: Residence | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type PickupPatch =
  | { residence: "careHome" }
  | { residence: "home"; address: string; latitude: number; longitude: number };

export type PickupEditorStrings = {
  label: string;
  pickup: RiderCardStrings["pickup"];
  address: RiderCardStrings["address"];
};

const toPatch = (value: PickupValue): PickupPatch | null =>
  value.residence === "careHome"
    ? { residence: "careHome" }
    : value.residence === "home" &&
        value.address !== null &&
        value.latitude !== null &&
        value.longitude !== null
      ? {
          residence: "home",
          address: value.address,
          latitude: value.latitude,
          longitude: value.longitude,
        }
      : null;

export function PickupEditor({
  value,
  strings,
  lookup,
  labels,
  onSave,
  compact = false,
}: {
  value: PickupValue;
  strings: PickupEditorStrings;
  lookup: AddressLookup;
  labels: SaveLabels;
  onSave: (pickup: PickupPatch) => Promise<ActionResult>;
  compact?: boolean;
}) {
  const sessionToken = useMemo(() => crypto.randomUUID(), []);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const { shown, persist } = useOptimisticSave<PickupValue>(
    value,
    (next) => {
      const patch = toPatch(next);
      return patch
        ? onSave(patch)
        : Promise.resolve({ ok: false, error: "generic" });
    },
    labels,
  );

  const residence: Residence | null =
    searching && shown.residence !== "home" ? "home" : shown.residence;
  const undoable = toPatch(shown) !== null;

  const choose = (next: Residence) => {
    haptics.selectionChanged();
    if (next === "careHome") {
      setSearching(false);
      void persist(
        {
          residence: "careHome",
          address: null,
          latitude: null,
          longitude: null,
        },
        shown,
        undoable,
      );
      return;
    }
    if (shown.address) {
      void persist({ ...shown, residence: "home" }, shown, undoable);
      return;
    }
    setSearching(true);
  };

  const pick = (mapboxId: string) => {
    setResolving(true);
    void lookup.resolve({ mapboxId, sessionToken }).then((home) => {
      setResolving(false);
      if (!home) {
        haptics.error();
        return;
      }
      setSearching(false);
      void persist({ residence: "home", ...home }, shown, undoable);
    });
  };

  const option = cn(
    "min-w-0 rounded-md px-2.5 font-medium text-ink-soft transition-[background-color,color,box-shadow] hover:bg-transparent hover:text-ink focus-visible:ring-2 focus-visible:ring-ink data-[state=on]:bg-canvas data-[state=on]:text-ink data-[state=on]:shadow-xs",
    compact ? "h-7 text-xs" : "h-9 text-sm",
  );

  return (
    <div className="grid min-w-0 gap-3">
      <ToggleGroup
        type="single"
        value={residence ?? ""}
        onValueChange={(next) => {
          if ((next === "careHome" || next === "home") && next !== residence)
            choose(next);
        }}
        aria-label={strings.label}
        spacing={0.5}
        className="grid w-full auto-cols-fr grid-flow-col rounded-lg bg-canvas-deep p-0.5"
      >
        {(["careHome", "home"] as const).map((choice) => (
          <ToggleGroupItem
            key={choice}
            value={choice}
            className={option}
          >
            {strings.pickup[choice]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {residence !== "home" ? null : resolving ? (
        <p className="flex min-h-9 items-center gap-2 px-1 text-sm text-ink-soft">
          <Loader2
            aria-hidden
            className="size-4 animate-spin motion-reduce:animate-none"
          />
          {strings.address.searching}
        </p>
      ) : searching || !shown.address ? (
        <div
          onKeyDown={(event) => {
            if (event.key === "Escape" && shown.address) setSearching(false);
          }}
        >
          <AddressSearch
            search={(query) => lookup.search({ query, sessionToken })}
            strings={strings.address}
            onPick={(suggestion) => pick(suggestion.id)}
            autoFocus={searching}
            defaultQuery={shown.address ?? ""}
            inputClassName={compact ? "h-9 text-2sm" : undefined}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setSearching(true)}
          className={cn(
            "flex w-full min-w-0 items-start gap-3 rounded-(--r-card) text-left transition-colors hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none",
            compact ? "-mx-2 w-[calc(100%+1rem)] p-2 text-2sm" : "p-3",
          )}
        >
          <MapPin
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-ink-faint"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-pretty text-ink">{shown.address}</span>
            <span className="block text-xs text-ink-soft">
              {strings.pickup.change}
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
