"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { X } from "lucide-react";
import { notify } from "@/components/action-feedback";
import { EntityCombobox } from "@/components/entity-combobox";
import { PersonAvatar } from "@/components/person-avatar";
import { Button } from "@/components/ui/button";
import {
  assignPilotAction,
  unassignPilotAction,
} from "@/features/rides/actions";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";
import type { RosterLabels } from "./ride-roster";

type Pilot = { id: string; name: string; href: string; avatar: string };
type Choice = { id: string; name: string };

export function RidePilots({
  rideId,
  editable,
  required,
  assigned,
  choices,
  language,
  labels,
}: {
  rideId: string;
  editable: boolean;
  required: number;
  assigned: Pilot[];
  choices: Choice[];
  language: Locale;
  labels: RosterLabels;
}) {
  const pickerId = useId();
  const [picker, setPicker] = useState(0);
  const [pending, startTransition] = useTransition();
  const say = (template: string, name: string) =>
    formatMessage(template, { name }, language);
  const short = assigned.length < required;

  const assign = (userId: string | null) => {
    const pilot = choices.find((choice) => choice.id === userId);
    if (!pilot) return;
    startTransition(async () => {
      const result = await assignPilotAction({ rideId, userId: pilot.id });
      notify(result, {
        done:
          result.ok && !result.changed
            ? labels.unchanged
            : say(labels.pilotAdded, pilot.name),
        errors: labels.errors,
      });
      setPicker((count) => count + 1);
    });
  };

  const remove = (pilot: Pilot) =>
    startTransition(async () => {
      const result = await unassignPilotAction({ rideId, userId: pilot.id });
      notify(result, {
        done:
          result.ok && !result.changed
            ? labels.unchanged
            : say(labels.pilotRemoved, pilot.name),
        errors: labels.errors,
      });
    });

  return (
    <div
      aria-busy={pending}
      className="grid gap-3"
    >
      <p
        className={cn(
          "text-2sm tabular-nums",
          short ? "text-ink" : "text-ink-soft",
        )}
      >
        {formatMessage(
          labels.pilotsCount,
          { assigned: assigned.length, required },
          language,
        )}
      </p>
      {assigned.length > 0 ? (
        <ul className="grid gap-1">
          {assigned.map((pilot) => (
            <li
              key={pilot.id}
              className="flex min-h-8 items-center gap-2"
            >
              <Link
                href={pilot.href}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-2sm underline-offset-2 hover:underline"
              >
                <PersonAvatar
                  svg={pilot.avatar}
                  size="sm"
                />
                <span className="truncate">{pilot.name}</span>
              </Link>
              {editable ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={pending}
                  onClick={() => remove(pilot)}
                  aria-label={say(labels.removePilot, pilot.name)}
                  className="size-8 text-ink-soft hover:text-ink"
                >
                  <X aria-hidden />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-2sm text-ink-soft">{labels.noPilots}</p>
      )}
      {editable ? (
        <div>
          <label
            htmlFor={pickerId}
            className="sr-only"
          >
            {labels.addPilot}
          </label>
          <EntityCombobox
            key={picker}
            id={pickerId}
            items={choices}
            value={null}
            onChange={assign}
            getLabel={(person) => person.name}
            renderItem={(person) => person.name}
            placeholder={labels.addPilot}
            empty={labels.addPilotEmpty}
            className="h-9 bg-canvas text-2sm"
          />
        </div>
      ) : null}
    </div>
  );
}
