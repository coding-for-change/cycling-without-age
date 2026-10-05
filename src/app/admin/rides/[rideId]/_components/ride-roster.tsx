"use client";

import { useId, useState, useTransition } from "react";
import { X } from "lucide-react";
import { notify } from "@/components/action-feedback";
import { EntityCombobox } from "@/components/entity-combobox";
import { Button } from "@/components/ui/button";
import { bookRiderAction, removeRiderAction } from "@/features/rides/actions";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";

type Person = { id: string; name: string };

export type RosterLabels = Dictionary["rides"]["detail"] & {
  errors: { generic: string } & Record<string, string>;
};

export function RideRoster({
  rideId,
  editable,
  riders,
  choices,
  language,
  labels,
}: {
  rideId: string;
  editable: boolean;
  riders: Person[];
  choices: Person[];
  language: Locale;
  labels: RosterLabels;
}) {
  const pickerId = useId();
  const [picker, setPicker] = useState(0);
  const [pending, startTransition] = useTransition();
  const say = (template: string, name: string) =>
    formatMessage(template, { name }, language);

  const book = (passengerId: string | null) => {
    const rider = choices.find((choice) => choice.id === passengerId);
    if (!rider) return;
    startTransition(async () => {
      const result = await bookRiderAction({ rideId, passengerId: rider.id });
      notify(result, {
        done:
          result.ok && !result.changed
            ? labels.unchanged
            : say(labels.riderAdded, rider.name),
        errors: labels.errors,
      });
      setPicker((count) => count + 1);
    });
  };

  const remove = (rider: Person) =>
    startTransition(async () => {
      const result = await removeRiderAction({
        rideId,
        passengerId: rider.id,
      });
      notify(result, {
        done:
          result.ok && !result.changed
            ? labels.unchanged
            : say(labels.riderRemoved, rider.name),
        errors: labels.errors,
      });
    });

  return (
    <div
      aria-busy={pending}
      className="grid gap-3"
    >
      {riders.length > 0 ? (
        <ol className="grid divide-y divide-line overflow-hidden rounded-xl border border-line">
          {riders.map((rider, index) => (
            <li
              key={rider.id}
              className="flex min-h-11 items-center gap-3 px-4 py-1.25"
            >
              <span className="w-4 shrink-0 text-right text-2sm tabular-nums text-ink-faint">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-2sm">
                {rider.name}
              </span>
              {editable ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={pending}
                  onClick={() => remove(rider)}
                  aria-label={say(labels.removeRider, rider.name)}
                  className="size-8 text-ink-soft hover:text-ink"
                >
                  <X aria-hidden />
                </Button>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-2sm text-ink-soft">{labels.noRiders}</p>
      )}
      {editable ? (
        <div className="max-w-sm">
          <label
            htmlFor={pickerId}
            className="sr-only"
          >
            {labels.addRider}
          </label>
          <EntityCombobox
            key={picker}
            id={pickerId}
            items={choices}
            value={null}
            onChange={book}
            getLabel={(person) => person.name}
            renderItem={(person) => person.name}
            placeholder={labels.addRider}
            empty={labels.addRiderEmpty}
            className="h-9 text-2sm"
          />
        </div>
      ) : null}
    </div>
  );
}
