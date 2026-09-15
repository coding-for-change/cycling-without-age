"use client";

import { useMemo } from "react";
import { InlineField } from "@/components/inline-field";
import { FieldRow, SelectRow } from "@/components/settings-rows";
import { updateOwnDetailsAction } from "@/features/profile/actions";
import { formatDate, toIsoDateLocal } from "@/lib/format";
import type { ActionResult } from "@/components/action-feedback";
import type { AccountData } from "./types";

const GENDERS = ["female", "male", "other"] as const;

const EARLIEST_BIRTH_DATE = "1900-01-01";

const rejected: ActionResult = { ok: false, error: "invalid" };

export function ProfileSection({ data }: { data: AccountData }) {
  const strings = data.strings;
  const today = useMemo(() => toIsoDateLocal(new Date()), []);

  return (
    <ul className="grid divide-y divide-line">
      <FieldRow label={strings.profile.name}>
        <InlineField
          value={data.profile.name}
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
      <FieldRow label={strings.profile.birthDate}>
        <InlineField
          type="date"
          max={today}
          value={data.profile.birthDate}
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
    </ul>
  );
}
