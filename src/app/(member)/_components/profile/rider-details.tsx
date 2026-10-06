"use client";

import { useMemo } from "react";
import { Trash2 } from "lucide-react";
import type { ActionResult } from "@/components/action-feedback";
import {
  ConfirmDeleteDialog,
  type ConfirmDeleteLabels,
} from "@/components/confirm-delete-dialog";
import { InlineField, type InlineFieldLabels } from "@/components/inline-field";
import {
  PickupEditor,
  type PickupEditorStrings,
  type PickupValue,
} from "@/components/riders/pickup-editor";
import type { AddressLookup } from "@/components/riders/rider-card";
import {
  SettingsGroup,
  SettingsItem,
  SettingsRowButton,
} from "@/components/settings-group";
import { FieldRow, SelectRow } from "@/components/settings-rows";
import {
  removeManagedRiderAction,
  updateManagedRiderAction,
} from "@/features/passengers/actions";
import type { ManagedRiderPatchInput } from "@/features/passengers/schemas";
import {
  formatDate,
  toIsoDateLocal,
  type Locale as Notation,
} from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";

const GENDERS = ["female", "male", "other"] as const;
type Gender = (typeof GENDERS)[number];

const EARLIEST_BIRTH_DATE = "1900-01-01";

const INLINE = "mx-0 w-full text-right text-ink-soft";

const rejected: ActionResult = { ok: false, error: "invalid" };

export type RiderDetailsData = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: Gender;
  pickup: PickupValue;
};

export type RiderDetailsStrings = {
  firstName: string;
  lastName: string;
  birthDate: string;
  invalidBirthDate: string;
  gender: string;
  genders: Record<Gender, string>;
  pickup: PickupEditorStrings;
  remove: ConfirmDeleteLabels;
  cancel: string;
};

export function RiderDetails({
  rider,
  strings,
  labels,
  lookup,
  language,
  notation,
  backHref,
}: {
  rider: RiderDetailsData;
  strings: RiderDetailsStrings;
  labels: InlineFieldLabels;
  lookup: AddressLookup;
  language: Locale;
  notation: Notation;
  backHref: string;
}) {
  const today = useMemo(() => toIsoDateLocal(new Date()), []);
  const save = (patch: ManagedRiderPatchInput) =>
    updateManagedRiderAction(rider.id, patch);
  const name = (key: "firstName" | "lastName") => (
    <FieldRow
      inline
      label={strings[key]}
    >
      <InlineField
        value={rider[key]}
        className={INLINE}
        label={strings[key]}
        placeholder={strings[key]}
        maxLength={80}
        required
        labels={labels}
        onSave={(next) =>
          next === null ? Promise.resolve(rejected) : save({ [key]: next })
        }
      />
    </FieldRow>
  );

  return (
    <>
      <SettingsGroup>
        {name("firstName")}
        {name("lastName")}
        <FieldRow
          inline
          label={strings.birthDate}
        >
          <InlineField
            type="date"
            max={today}
            value={rider.birthDate}
            className={INLINE}
            label={strings.birthDate}
            placeholder={strings.birthDate}
            required
            validate={(next) => next >= EARLIEST_BIRTH_DATE && next <= today}
            display={(value) => formatDate(value, notation)}
            labels={{ ...labels, invalid: strings.invalidBirthDate }}
            onSave={(next) =>
              next === null
                ? Promise.resolve(rejected)
                : save({ birthDate: next })
            }
          />
        </FieldRow>
        <SelectRow
          value={rider.gender}
          label={strings.gender}
          options={GENDERS.map((value) => ({
            value,
            label: strings.genders[value],
          }))}
          labels={labels}
          onSave={(next) =>
            next === null
              ? Promise.resolve(rejected)
              : save({ gender: next as Gender })
          }
        />
        <FieldRow label={strings.pickup.label}>
          <div className="pt-1.25">
            <PickupEditor
              value={rider.pickup}
              strings={strings.pickup}
              lookup={lookup}
              labels={labels}
              onSave={(pickup) => save({ pickup })}
            />
          </div>
        </FieldRow>
      </SettingsGroup>

      <SettingsGroup>
        <SettingsItem>
          <ConfirmDeleteDialog
            name={rider.name}
            labels={strings.remove}
            locale={language}
            cancel={strings.cancel}
            action={removeManagedRiderAction}
            input={rider.id}
            redirectTo={backHref}
            trigger={
              <SettingsRowButton
                icon={Trash2}
                tone="destructive"
                label={formatMessage(
                  strings.remove.open,
                  { name: rider.name },
                  language,
                )}
              />
            }
          />
        </SettingsItem>
      </SettingsGroup>
    </>
  );
}
