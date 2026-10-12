"use client";

import type { ActionResult } from "@/components/action-feedback";
import { InlineField } from "@/components/inline-field";
import { SettingsGroup } from "@/components/settings-group";
import { FieldRow, SelectRow, ToggleRow } from "@/components/settings-rows";
import { updateOwnRiderNeedsAction } from "@/features/passengers/actions";
import {
  RIDER_NOTE_MAX,
  type RiderNeedsInput,
} from "@/features/passengers/schemas";
import type { AccountData } from "./types";

const NONE = "none";

export function RiderNeedsGroup({ data }: { data: AccountData }) {
  const rider = data.rider;
  if (!rider) return null;
  const strings = rider.strings;
  const save = (input: RiderNeedsInput): Promise<ActionResult> =>
    updateOwnRiderNeedsAction(input);

  return (
    <SettingsGroup label={strings.title}>
      <ToggleRow
        value={rider.needsWheelchairBike}
        label={strings.wheelchair.label}
        hint={strings.wheelchair.hint}
        labels={data.strings.field}
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
          labels={data.strings.field}
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
          labels={data.strings.field}
        />
      </FieldRow>
    </SettingsGroup>
  );
}
