"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Check, Loader2, MapPin, Pencil, X } from "lucide-react";
import { AddressSearch } from "@/components/address-search";
import { Field, type Gender } from "@/components/person-fields";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";
import type { PlaceSuggestion } from "@/lib/mapbox";

type Pickup = { address: string; latitude: number; longitude: number };

export type RiderDraft = {
  key: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: Gender | null;
  residence: "careHome" | "home";
  home: Pickup | null;
};

export type RiderCardStrings = {
  rider: string;
  remove: string;
  edit: string;
  done: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  genders: Record<Gender, string>;
  pickup: { label: string; careHome: string; home: string; change: string };
  address: {
    label: string;
    placeholder: string;
    hint: string;
    searching: string;
    noResults: string;
  };
};

export type AddressLookup = {
  search: (input: {
    query: string;
    sessionToken: string;
  }) => Promise<PlaceSuggestion[]>;
  resolve: (input: {
    mapboxId: string;
    sessionToken: string;
  }) => Promise<Pickup | null>;
};

export const emptyRider = (): RiderDraft => ({
  key: crypto.randomUUID(),
  firstName: "",
  lastName: "",
  birthDate: "",
  gender: null,
  residence: "careHome",
  home: null,
});

export const isRiderComplete = (rider: RiderDraft) =>
  Boolean(
    rider.firstName.trim() &&
    rider.lastName.trim() &&
    rider.birthDate &&
    rider.gender &&
    (rider.residence === "careHome" || rider.home),
  );

export const riderPayload = (rider: RiderDraft) => ({
  firstName: rider.firstName,
  lastName: rider.lastName,
  birthDate: rider.birthDate,
  gender: rider.gender,
  pickup:
    rider.residence === "home" && rider.home
      ? { residence: "home" as const, ...rider.home }
      : { residence: "careHome" as const },
});

export function RiderCard({
  rider,
  title,
  strings,
  lookup,
  onChange,
  onRemove,
  onDone,
}: {
  rider: RiderDraft;
  title: string;
  strings: RiderCardStrings;
  lookup: AddressLookup;
  onChange: (patch: Partial<RiderDraft>) => void;
  onRemove?: () => void;
  onDone?: () => void;
}) {
  const sessionToken = useMemo(() => crypto.randomUUID(), []);
  const [resolving, setResolving] = useState(false);
  const id = (field: string) => `${rider.key}-${field}`;
  const today = new Date().toISOString().slice(0, 10);

  const pick = (suggestion: PlaceSuggestion) => {
    setResolving(true);
    void lookup
      .resolve({ mapboxId: suggestion.id, sessionToken })
      .then((home) => {
        setResolving(false);
        if (home) {
          haptics.success();
          onChange({ home });
        } else haptics.error();
      });
  };

  return (
    <section className="space-y-3 rounded-(--r-card) border border-line bg-canvas p-4">
      <header className="flex min-h-8 items-center justify-between gap-3">
        <h2 className="truncate font-display text-base font-bold text-ink">
          {title}
        </h2>
        <div className="flex shrink-0 items-center gap-1.25">
          {onRemove && (
            <CardAction
              onClick={onRemove}
              icon={<X aria-hidden />}
              label={strings.remove}
            />
          )}
          {onDone && (
            <CardAction
              onClick={onDone}
              disabled={!isRiderComplete(rider)}
              icon={<Check aria-hidden />}
              label={strings.done}
              emphasis
            />
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Field
          id={id("first-name")}
          label={strings.firstName}
        >
          <Input
            id={id("first-name")}
            value={rider.firstName}
            onChange={(event) => onChange({ firstName: event.target.value })}
            autoComplete="off"
            className="h-11 rounded-(--r-card) border-line text-base"
          />
        </Field>
        <Field
          id={id("last-name")}
          label={strings.lastName}
        >
          <Input
            id={id("last-name")}
            value={rider.lastName}
            onChange={(event) => onChange({ lastName: event.target.value })}
            autoComplete="off"
            className="h-11 rounded-(--r-card) border-line text-base"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          id={id("birth-date")}
          label={strings.birthDate}
        >
          <Input
            id={id("birth-date")}
            type="date"
            value={rider.birthDate}
            max={today}
            onChange={(event) => onChange({ birthDate: event.target.value })}
            className="h-11 rounded-(--r-card) border-line text-base"
          />
        </Field>

        <Field
          id={id("gender")}
          label={strings.gender}
        >
          <NativeSelect
            id={id("gender")}
            value={rider.gender ?? ""}
            onChange={(event) =>
              onChange({ gender: event.target.value as Gender })
            }
            wrapperClassName="w-full"
            className="h-11 rounded-(--r-card) border-line bg-canvas text-base"
          >
            <NativeSelectOption
              value=""
              disabled
            >
              —
            </NativeSelectOption>
            {(["female", "male", "other"] as const).map((option) => (
              <NativeSelectOption
                key={option}
                value={option}
              >
                {strings.genders[option]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-ink-soft">
          {strings.pickup.label}
        </legend>
        <Tabs
          value={rider.residence}
          onValueChange={(value) => {
            haptics.selectionChanged();
            onChange({ residence: value as RiderDraft["residence"] });
          }}
        >
          <TabsList className="w-full rounded-full bg-grey-tint p-1 group-data-[orientation=horizontal]/tabs:h-11">
            {(["careHome", "home"] as const).map((option) => (
              <TabsTrigger
                key={option}
                value={option}
                className="rounded-full text-base data-[state=active]:bg-canvas data-[state=active]:text-ink"
              >
                {strings.pickup[option]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {rider.residence === "home" && (
          <div className="mt-3">
            {resolving ? (
              <p className="flex h-11 items-center gap-2 px-1 text-sm text-ink-soft">
                <Loader2
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden
                />
                {strings.address.searching}
              </p>
            ) : rider.home ? (
              <button
                type="button"
                onClick={() => onChange({ home: null })}
                className="flex w-full items-start gap-3 rounded-(--r-card) border border-line bg-canvas px-4 py-3 text-left transition-colors hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
              >
                <MapPin
                  className="mt-0.5 size-5 shrink-0 text-ink-faint"
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-ink">
                    {rider.home.address}
                  </span>
                  <span className="block text-sm text-ink-soft">
                    {strings.pickup.change}
                  </span>
                </span>
              </button>
            ) : (
              <AddressSearch
                search={(query) => lookup.search({ query, sessionToken })}
                strings={strings.address}
                onPick={pick}
              />
            )}
          </div>
        )}
      </fieldset>
    </section>
  );
}

function CardAction({
  onClick,
  icon,
  label,
  disabled,
  emphasis,
}: {
  onClick: () => void;
  icon: ReactNode;
  label: string;
  disabled?: boolean;
  emphasis?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-8 items-center gap-1 rounded-full px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none disabled:opacity-50 [&_svg]:size-4",
        emphasis
          ? "bg-mint-tint font-medium text-ink hover:bg-mint"
          : "text-ink-soft hover:bg-canvas-deep hover:text-ink",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export function RiderSummary({
  rider,
  meta,
  strings,
  onEdit,
  onRemove,
}: {
  rider: RiderDraft;
  meta: string;
  strings: Pick<RiderCardStrings, "edit" | "remove">;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const name = `${rider.firstName} ${rider.lastName}`.trim();
  return (
    <div className="flex min-h-13 items-center gap-3 rounded-(--r-card) border border-line bg-canvas py-2 pr-2 pl-4">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-ink">{name}</span>
        <span className="block truncate text-sm text-ink-soft">{meta}</span>
      </span>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`${strings.edit}: ${name}`}
        className="grid size-9 place-items-center rounded-full text-ink-soft transition-colors hover:bg-canvas-deep hover:text-ink focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
      >
        <Pencil
          className="size-4"
          aria-hidden
        />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${strings.remove}: ${name}`}
        className="grid size-9 place-items-center rounded-full text-ink-soft transition-colors hover:bg-canvas-deep hover:text-ink focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
      >
        <X
          className="size-4"
          aria-hidden
        />
      </button>
    </div>
  );
}
