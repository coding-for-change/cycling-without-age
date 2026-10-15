"use client";

import { useId, useState, type FormEvent } from "react";
import { notify, type NotifyLabels } from "@/components/action-feedback";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  currencyName,
  currencySymbol,
  formatNumber,
  wordsLocale,
  type Locale as Notation,
} from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { submitDebriefAction } from "../actions";
import {
  DEBRIEF_MAX_DONATION_CENTS,
  DEBRIEF_MAX_KM,
  DEBRIEF_NOTE_MAX,
  DEBRIEF_RATINGS,
  parseDecimal,
  type DebriefRatingName,
} from "../schemas";

export type DebriefLabels = {
  title: string;
  hint: string;
  distance: string;
  distanceHint: string;
  unit: string;
  donation: string;
  donationHint: string;
  donationHintNoCurrency: string;
  bikeCondition: string;
  bikePoor: string;
  cooperation: string;
  cooperationHint: string;
  ratings: Record<DebriefRatingName, string>;
  note: string;
  notePlaceholder: string;
  invalidNumber: string;
  save: string;
  saving: string;
  saved: string;
  errors: NotifyLabels["errors"];
};

export type DebriefValues = {
  distanceKm: number | null;
  donationCents: number | null;
  bikeCondition: DebriefRatingName | null;
  cooperation: DebriefRatingName | null;
  note: string | null;
};

const decimal = (value: number | null, notation: Notation) =>
  value === null
    ? ""
    : formatNumber(value, notation, {
        useGrouping: false,
        maximumFractionDigits: 2,
      });

const withinRange = (raw: string, max: number) => {
  const value = parseDecimal(raw);
  return value === null || (!Number.isNaN(value) && value <= max);
};

/** Story 31: the pilot's few lines after the ride, saved as often as they like. */
export function DebriefForm({
  rideId,
  functional,
  currency,
  initial,
  language,
  notation,
  labels,
}: {
  rideId: string;
  functional: boolean;
  currency: string | null;
  initial: DebriefValues | null;
  language: Locale;
  notation: Notation;
  labels: DebriefLabels;
}) {
  const ids = {
    distance: useId(),
    donation: useId(),
    bike: useId(),
    cooperation: useId(),
    note: useId(),
  };
  const [distance, setDistance] = useState(
    decimal(initial?.distanceKm ?? null, notation),
  );
  const [donation, setDonation] = useState(
    decimal(
      initial?.donationCents == null ? null : initial.donationCents / 100,
      notation,
    ),
  );
  const [bikeCondition, setBikeCondition] = useState(
    initial?.bikeCondition ?? null,
  );
  const [cooperation, setCooperation] = useState(initial?.cooperation ?? null);
  const [note, setNote] = useState(initial?.note ?? "");
  const [pending, setPending] = useState(false);

  const distanceOk = withinRange(distance, DEBRIEF_MAX_KM);
  const donationOk = withinRange(donation, DEBRIEF_MAX_DONATION_CENTS / 100);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !distanceOk || !donationOk) return;
    const km = functional ? parseDecimal(distance) : null;
    const amount = parseDecimal(donation);
    setPending(true);
    const result = await submitDebriefAction({
      rideId,
      distanceKm: km,
      donationCents: amount === null ? null : Math.round(amount * 100),
      bikeCondition,
      cooperation,
      note,
    });
    setPending(false);
    notify(result, { done: labels.saved, errors: labels.errors });
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-5"
    >
      {functional ? (
        <Field data-invalid={!distanceOk || undefined}>
          <FieldLabel htmlFor={ids.distance}>{labels.distance}</FieldLabel>
          <div className="flex items-center gap-3">
            <Input
              id={ids.distance}
              inputMode="decimal"
              autoComplete="off"
              value={distance}
              onChange={(event) => setDistance(event.target.value)}
              aria-invalid={!distanceOk || undefined}
              className="max-w-32 tabular-nums"
            />
            <span className="text-sm text-ink-soft">{labels.unit}</span>
          </div>
          {distanceOk ? (
            <FieldDescription>{labels.distanceHint}</FieldDescription>
          ) : (
            <FieldError>{labels.invalidNumber}</FieldError>
          )}
        </Field>
      ) : null}

      <Field data-invalid={!donationOk || undefined}>
        <FieldLabel htmlFor={ids.donation}>{labels.donation}</FieldLabel>
        <div className="flex items-center gap-3">
          <Input
            id={ids.donation}
            inputMode="decimal"
            autoComplete="off"
            value={donation}
            onChange={(event) => setDonation(event.target.value)}
            aria-invalid={!donationOk || undefined}
            className="max-w-32 tabular-nums"
          />
          {currency ? (
            <span className="text-sm text-ink-soft">
              {currencySymbol(currency, notation)}
            </span>
          ) : null}
        </div>
        {donationOk ? (
          <FieldDescription>
            {currency
              ? formatMessage(
                  labels.donationHint,
                  { currency: currencyName(currency, wordsLocale(language)) },
                  language,
                )
              : labels.donationHintNoCurrency}
          </FieldDescription>
        ) : (
          <FieldError>{labels.invalidNumber}</FieldError>
        )}
      </Field>

      <Rating
        id={ids.bike}
        label={labels.bikeCondition}
        value={bikeCondition}
        onChange={setBikeCondition}
        labels={labels.ratings}
        hint={bikeCondition === "poor" ? labels.bikePoor : null}
      />

      <Rating
        id={ids.cooperation}
        label={labels.cooperation}
        value={cooperation}
        onChange={setCooperation}
        labels={labels.ratings}
        hint={labels.cooperationHint}
      />

      <Field>
        <FieldLabel htmlFor={ids.note}>{labels.note}</FieldLabel>
        <Textarea
          id={ids.note}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={labels.notePlaceholder}
          maxLength={DEBRIEF_NOTE_MAX}
          rows={3}
        />
      </Field>

      <Button
        type="submit"
        variant="outline"
        disabled={pending || !distanceOk || !donationOk}
        className="min-h-11 w-full rounded-full border-line sm:w-fit"
      >
        {pending ? labels.saving : labels.save}
      </Button>
    </form>
  );
}

function Rating({
  id,
  label,
  value,
  onChange,
  labels,
  hint,
}: {
  id: string;
  label: string;
  value: DebriefRatingName | null;
  onChange: (next: DebriefRatingName | null) => void;
  labels: Record<DebriefRatingName, string>;
  hint: string | null;
}) {
  return (
    <Field>
      <FieldLabel id={id}>{label}</FieldLabel>
      <ToggleGroup
        type="single"
        variant="outline"
        aria-labelledby={id}
        value={value ?? ""}
        onValueChange={(next) =>
          onChange(next ? (next as DebriefRatingName) : null)
        }
        className="w-full sm:w-fit"
      >
        {DEBRIEF_RATINGS.map((rating) => (
          <ToggleGroupItem
            key={rating}
            value={rating}
            className="min-h-11 flex-1 border-line px-4 data-[state=on]:bg-mint-tint data-[state=on]:text-ink sm:flex-none"
          >
            {labels[rating]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {hint ? <FieldDescription>{hint}</FieldDescription> : null}
    </Field>
  );
}
