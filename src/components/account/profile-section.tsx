"use client";

import { useMemo } from "react";
import { InlineField } from "@/components/inline-field";
import { SettingsGroup } from "@/components/settings-group";
import { FieldRow, SelectRow } from "@/components/settings-rows";
import { updateOwnDetailsAction } from "@/features/profile/actions";
import { formatDate, toIsoDateLocal } from "@/lib/format";
import type { ActionResult } from "@/components/action-feedback";
import type { AccountData } from "./types";

const GENDERS = ["female", "male", "other"] as const;

const EARLIEST_BIRTH_DATE = "1900-01-01";

const INLINE = "mx-0 w-full text-right text-ink-soft";

const rejected: ActionResult = { ok: false, error: "invalid" };

export function ProfileSection({
  data,
  label,
}: {
  data: AccountData;
  label?: string;
}) {
  const strings = data.strings;
  const today = useMemo(() => toIsoDateLocal(new Date()), []);

  return (
    <SettingsGroup label={label}>
      <FieldRow
        inline
        label={strings.profile.name}
      >
        <InlineField
          value={data.profile.name}
          className={INLINE}
          label={strings.profile.name}
          placeholder={strings.profile.namePlaceholder}
          maxLength={120}
          required
          labels={strings.field}
          onSave={(next) =>
            next === null
              ? Promise.resolve(rejected)
              : updateOwnDetailsAction({ name: next })
          }
        />
      </FieldRow>
      <FieldRow
        inline
        label={strings.profile.birthDate}
      >
        <InlineField
          type="date"
          max={today}
          value={data.profile.birthDate}
          className={INLINE}
          label={strings.profile.birthDate}
          placeholder={strings.profile.birthDatePlaceholder}
          required
          validate={(next) => next >= EARLIEST_BIRTH_DATE && next <= today}
          display={(value) => formatDate(value, data.notation)}
          labels={{
            ...strings.field,
            invalid: strings.profile.invalidBirthDate,
          }}
          onSave={(next) =>
            next === null
              ? Promise.resolve(rejected)
              : updateOwnDetailsAction({ birthDate: next })
          }
        />
      </FieldRow>
      <SelectRow
        value={data.profile.gender}
        label={strings.profile.gender}
        placeholder={
          data.profile.gender === null
            ? strings.profile.genderPlaceholder
            : undefined
        }
        options={GENDERS.map((value) => ({
          value,
          label: strings.profile.genders[value],
        }))}
        labels={strings.field}
        onSave={(next) =>
          next === null
            ? Promise.resolve(rejected)
            : updateOwnDetailsAction({ gender: next })
        }
      />
    </SettingsGroup>
  );
}
