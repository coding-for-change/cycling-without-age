"use client";

import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import type { NotifyLabels } from "@/components/action-feedback";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatNumber, type Locale as Notation } from "@/lib/format";
import { submitDebriefAction } from "../actions";
import {
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
  bikeCondition: string;
  bikePoor: string;
  cooperation: string;
  cooperationHint: string;
  ratings: Record<DebriefRatingName, string>;
  note: string;
  notePlaceholder: string;
  invalidNumber: string;
  autosaves: string;
  saving: string;
  savedStatus: string;
  errors: NotifyLabels["errors"];
};

export type DebriefValues = {
  distanceKm: number | null;
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

const SAVE_AFTER_MS = 900;

type Draft = {
  distance: string;
  bikeCondition: DebriefRatingName | null;
  cooperation: DebriefRatingName | null;
  note: string;
};

/** What the server gets for a draft, or null while a number is still wrong. */
function payloadOf(draft: Draft, rideId: string, functional: boolean) {
  if (!withinRange(draft.distance, DEBRIEF_MAX_KM)) return null;
  return {
    rideId,
    distanceKm: functional ? parseDecimal(draft.distance) : null,
    bikeCondition: draft.bikeCondition,
    cooperation: draft.cooperation,
    note: draft.note,
  };
}

/**
 * Story 31: the pilot's few lines after the ride. They save themselves a
 * moment after each change, and on leaving the page, so the big button that
 * closes the ride can never lose them.
 */
export function DebriefForm({
  rideId,
  functional,
  initial,
  notation,
  labels,
}: {
  rideId: string;
  functional: boolean;
  initial: DebriefValues | null;
  notation: Notation;
  labels: DebriefLabels;
}) {
  const ids = {
    distance: useId(),
    bike: useId(),
    cooperation: useId(),
    note: useId(),
  };
  const [distance, setDistance] = useState(
    decimal(initial?.distanceKm ?? null, notation),
  );
  const [bikeCondition, setBikeCondition] = useState(
    initial?.bikeCondition ?? null,
  );
  const [cooperation, setCooperation] = useState(initial?.cooperation ?? null);
  const [note, setNote] = useState(initial?.note ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [saved] = useState(() =>
    JSON.stringify(
      payloadOf(
        { distance, bikeCondition, cooperation, note },
        rideId,
        functional,
      ),
    ),
  );
  const lastSaved = useRef(saved);
  const pending = useRef<(() => void) | null>(null);

  const distanceOk = withinRange(distance, DEBRIEF_MAX_KM);

  useEffect(() => {
    const payload = payloadOf(
      { distance, bikeCondition, cooperation, note },
      rideId,
      functional,
    );
    const key = JSON.stringify(payload);
    if (!payload || key === lastSaved.current) {
      pending.current = null;
      return;
    }
    const save = () => {
      pending.current = null;
      lastSaved.current = key;
      setStatus("saving");
      void submitDebriefAction(payload).then((result) => {
        if (result.ok) {
          setStatus("saved");
          return;
        }
        lastSaved.current = "";
        setStatus("idle");
        toast.error(labels.errors[result.error] ?? labels.errors.generic);
      });
    };
    pending.current = save;
    const timer = setTimeout(save, SAVE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [
    distance,
    bikeCondition,
    cooperation,
    note,
    rideId,
    functional,
    labels.errors,
  ]);

  useEffect(() => () => pending.current?.(), []);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        pending.current?.();
      }}
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

      <p
        aria-live="polite"
        className="text-2sm text-ink-soft"
      >
        {status === "saving"
          ? labels.saving
          : status === "saved"
            ? labels.savedStatus
            : labels.autosaves}
      </p>
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
