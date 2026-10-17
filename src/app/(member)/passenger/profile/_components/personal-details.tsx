"use client";

import { useMemo } from "react";
import { InlineField, type InlineFieldLabels } from "@/components/inline-field";
import { updatePersonProfileAction } from "@/features/person-profiles/actions";
import { useEditor } from "@/features/person-profiles/components/editor-context";
import { AgeToggle } from "@/features/person-profiles/components/profile-editor";
import { FieldRow, SelectRow } from "@/components/settings-rows";
import type { ActionResult } from "@/components/action-feedback";
import { updateOwnDetailsAction } from "@/features/profile/actions";
import { formatDate, toIsoDateLocal, type Locale } from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";

const GENDERS = ["female", "male", "other"] as const;
type Gender = (typeof GENDERS)[number];

const EARLIEST_BIRTH_DATE = "1900-01-01";
/** `PERSON_NAME_PART_MAX` in features/profile — the schema holds the line. */
const NAME_PART_MAX = 59;

const rejected: ActionResult = { ok: false, error: "invalid" };

export type PersonalDetailsStrings = {
  firstName: string;
  lastName: string;
  firstNamePlaceholder: string;
  lastNamePlaceholder: string;
  age: string;
  email: string;
  phone: string;
  contactHint: string;
  birthDate: string;
  birthDatePlaceholder: string;
  invalidBirthDate: string;
  gender: string;
  genderPlaceholder: string;
  genders: Record<Gender, string>;
};

/** Whole years between two ISO dates, as a birthday counts them. */
const yearsBetween = (from: string, to: string) => {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return ty - fy - (tm < fm || (tm === fm && td < fd) ? 1 : 0);
};

export function PersonalDetails({
  firstName,
  lastName,
  birthDate,
  age,
  hideAge,
  gender,
  email,
  phone,
  strings,
  labels,
  notation,
  words,
}: {
  firstName: string;
  lastName: string;
  birthDate: string | null;
  /** As main's profile counts it; `null` without a birth date. */
  age: number | null;
  hideAge: boolean;
  gender: Gender | null;
  email: string | null;
  phone: string | null;
  strings: PersonalDetailsStrings;
  labels: InlineFieldLabels;
  notation: Locale;
  words: Locale;
}) {
  const today = useMemo(() => toIsoDateLocal(new Date()), []);
  const { subject } = useEditor();
  const namePart = (
    part: "firstName" | "lastName",
    value: string,
    placeholder: string,
  ) => (
    <FieldRow
      inline
      label={strings[part]}
    >
      <InlineField
        value={value || null}
        className="mx-0 w-full text-right text-ink-soft"
        label={strings[part]}
        placeholder={placeholder}
        maxLength={NAME_PART_MAX}
        required
        labels={labels}
        onSave={(next) =>
          next === null
            ? Promise.resolve(rejected)
            : updateOwnDetailsAction({ [part]: next })
        }
      />
    </FieldRow>
  );

  return (
    <div className="flex flex-col gap-3">
      <ul className="divide-y divide-line rounded-2xl border border-line [&>li]:flex-wrap [&>li]:gap-y-1.25 [&>li]:px-4">
        {namePart("firstName", firstName, strings.firstNamePlaceholder)}
        {namePart("lastName", lastName, strings.lastNamePlaceholder)}
        <FieldRow
          inline
          label={strings.birthDate}
        >
          <InlineField
            type="date"
            max={today}
            value={birthDate}
            className="mx-0 w-full text-right text-ink-soft"
            label={strings.birthDate}
            placeholder={strings.birthDatePlaceholder}
            required
            validate={(next) => next >= EARLIEST_BIRTH_DATE && next <= today}
            display={(value) =>
              `${formatDate(value, notation)} · ${formatMessage(
                strings.age,
                { age: yearsBetween(value, today) },
                words,
              )}`
            }
            labels={{ ...labels, invalid: strings.invalidBirthDate }}
            onSave={(next) =>
              next === null
                ? Promise.resolve(rejected)
                : updateOwnDetailsAction({ birthDate: next })
            }
          />
        </FieldRow>
        <SelectRow
          value={gender}
          label={strings.gender}
          placeholder={gender === null ? strings.genderPlaceholder : undefined}
          options={GENDERS.map((value) => ({
            value,
            label: strings.genders[value],
          }))}
          labels={labels}
          onSave={(next) =>
            next === null
              ? Promise.resolve(rejected)
              : updateOwnDetailsAction({ gender: next as Gender })
          }
        />
        {email ? (
          <FieldRow
            inline
            label={strings.email}
          >
            <span className="truncate text-sm text-ink-soft">{email}</span>
          </FieldRow>
        ) : null}
        {phone ? (
          <FieldRow
            inline
            label={strings.phone}
          >
            <span className="truncate text-sm text-ink-soft tabular-nums">
              {phone}
            </span>
          </FieldRow>
        ) : null}
      </ul>
      {email || phone ? (
        <p className="px-4 text-sm text-ink-soft">{strings.contactHint}</p>
      ) : null}
      {age !== null ? (
        <AgeToggle
          age={age}
          hidden={hideAge}
          save={(next) =>
            updatePersonProfileAction({ subject, patch: { hideAge: next } })
          }
        />
      ) : null}
    </div>
  );
}
