"use client";

import { useState } from "react";
import type { ActionResult } from "@/components/action-feedback";
import { InlineField, type InlineFieldLabels } from "@/components/inline-field";
import { SettingsGroup } from "@/components/settings-group";
import { FieldRow, ToggleRow } from "@/components/settings-rows";
import { updateManagedRiderNeedsAction } from "../actions";
import { RIDER_NOTE_MAX, type RiderNeedsInput } from "../schemas";

type Strings = {
  title: string;
  wheelchair: { label: string; hint: string };
  note: { label: string; hint: string; placeholder: string };
};

export function ManagedRiderNeeds({
  passengerId,
  initial,
  strings,
  labels,
}: {
  passengerId: string;
  initial: { needsWheelchairBike: boolean; note: string | null };
  strings: Strings;
  labels: InlineFieldLabels;
}) {
  const [needs, setNeeds] = useState(initial);

  const save = async (input: RiderNeedsInput): Promise<ActionResult> => {
    const result = await updateManagedRiderNeedsAction(passengerId, input);
    if (result.ok) setNeeds((current) => ({ ...current, ...input }));
    return result;
  };

  return (
    <SettingsGroup label={strings.title}>
      <ToggleRow
        value={needs.needsWheelchairBike}
        label={strings.wheelchair.label}
        hint={strings.wheelchair.hint}
        labels={labels}
        onSave={(next) => save({ needsWheelchairBike: next })}
      />
      <FieldRow
        label={strings.note.label}
        hint={strings.note.hint}
      >
        <InlineField
          multiline
          maxLength={RIDER_NOTE_MAX}
          value={needs.note}
          label={strings.note.label}
          placeholder={strings.note.placeholder}
          onSave={(next) => save({ note: next })}
          labels={labels}
        />
      </FieldRow>
    </SettingsGroup>
  );
}
