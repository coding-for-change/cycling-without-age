"use client";

import { useEffect, useState } from "react";
import type { ActionResult } from "@/components/action-feedback";
import { InlineField } from "@/components/inline-field";
import { SettingsGroup } from "@/components/settings-group";
import { FieldRow, SelectRow, ToggleRow } from "@/components/settings-rows";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ownRiderNeedsAction,
  updateOwnRiderNeedsAction,
} from "@/features/passengers/actions";
import {
  RIDER_NOTE_MAX,
  type RiderNeedsInput,
} from "@/features/passengers/schemas";
import type { OwnRiderNeeds } from "@/use-cases/set-own-rider-needs";
import type { AccountData } from "./types";

const NONE = "none";

type Strings = NonNullable<AccountData["riderNeeds"]>;
type Labels = AccountData["strings"]["field"];

export function RiderNeedsGroup({ data }: { data: AccountData }) {
  if (!data.riderNeeds) return null;
  return (
    <RiderNeeds
      strings={data.riderNeeds}
      labels={data.strings.field}
    />
  );
}

function RiderNeeds({ strings, labels }: { strings: Strings; labels: Labels }) {
  const [rider, setRider] = useState<OwnRiderNeeds | null | undefined>();

  useEffect(() => {
    let live = true;
    ownRiderNeedsAction()
      .catch(() => null)
      .then((result) => {
        if (live) setRider(result?.ok ? result.rider : null);
      });
    return () => {
      live = false;
    };
  }, []);

  if (rider === undefined) return <RiderNeedsSkeleton label={strings.title} />;
  if (rider === null) return null;

  const save = async (input: RiderNeedsInput): Promise<ActionResult> => {
    const result = await updateOwnRiderNeedsAction(input);
    if (result.ok)
      setRider((current) => (current ? { ...current, ...input } : current));
    return result;
  };

  return (
    <SettingsGroup label={strings.title}>
      <ToggleRow
        value={rider.needsWheelchairBike}
        label={strings.wheelchair.label}
        hint={strings.wheelchair.hint}
        labels={labels}
        onSave={(next) => save({ needsWheelchairBike: next })}
      />
      {rider.careCenters.length > 0 ? (
        <SelectRow
          value={rider.rideLocationId ?? NONE}
          label={strings.careCenter.label}
          hint={strings.careCenter.hint}
          options={[
            { value: NONE, label: strings.careCenter.none },
            ...rider.careCenters.map((place) => ({
              value: place.id,
              label: place.name,
            })),
          ]}
          labels={labels}
          onSave={(next) =>
            save({ rideLocationId: next === NONE ? null : next })
          }
        />
      ) : null}
      <FieldRow
        label={strings.note.label}
        hint={strings.note.hint}
      >
        <InlineField
          multiline
          maxLength={RIDER_NOTE_MAX}
          value={rider.note}
          label={strings.note.label}
          placeholder={strings.note.placeholder}
          onSave={(next) => save({ note: next })}
          labels={labels}
        />
      </FieldRow>
    </SettingsGroup>
  );
}

function RiderNeedsSkeleton({ label }: { label: string }) {
  return (
    <SettingsGroup label={label}>
      {[0, 1, 2].map((row) => (
        <li
          key={row}
          className="flex min-h-11 items-center justify-between gap-5 py-3"
        >
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </li>
      ))}
    </SettingsGroup>
  );
}
