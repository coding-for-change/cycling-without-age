"use client";

import { useTransition } from "react";
import { notify } from "@/components/action-feedback";
import { PersonPicker, type PersonOption } from "@/components/people-picker";
import { PersonAvatar } from "@/components/person-avatar";
import {
  assignPilotAction,
  unassignPilotAction,
} from "@/features/rides/actions";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { DetailEmpty } from "../../../_components/detail-page";
import {
  CountMeta,
  PanelAddButton,
  PanelItem,
  SidePanel,
} from "../../../_components/side-panel";
import type { PilotLabels } from "./panel-labels";

type Pilot = { id: string; name: string; href: string; avatar: string };

export function RidePilots({
  rideId,
  editable,
  assigned,
  required,
  limit,
  choices,
  language,
  labels,
  pick,
}: {
  rideId: string;
  editable: boolean;
  assigned: Pilot[];
  required: number;
  limit: number | null;
  choices: PersonOption[];
  language: Locale;
  labels: PilotLabels;
  pick: { search: string; empty: string };
}) {
  const [pending, startTransition] = useTransition();
  const say = (template: string, name: string) =>
    formatMessage(template, { name }, language);
  const full = limit !== null && assigned.length >= limit;

  const run = (
    action: (input: {
      rideId: string;
      userId: string;
    }) => Promise<
      { ok: true; changed: boolean } | { ok: false; error: string }
    >,
    pilot: { id: string; name: string },
    done: string,
  ) =>
    startTransition(async () => {
      const result = await action({ rideId, userId: pilot.id });
      notify(result, {
        done:
          result.ok && !result.changed
            ? labels.unchanged
            : say(done, pilot.name),
        errors: labels.errors,
      });
    });

  return (
    <SidePanel
      title={labels.pilots}
      meta={
        <CountMeta
          count={assigned.length}
          max={required}
          highlight={assigned.length < required}
          srLabel={formatMessage(
            labels.pilotsCount,
            { assigned: assigned.length, required },
            language,
          )}
        />
      }
      action={
        editable ? (
          <PersonPicker
            options={choices}
            onPick={(pilot) => run(assignPilotAction, pilot, labels.added)}
            strings={pick}
          >
            <PanelAddButton
              disabled={pending || full || choices.length === 0}
              label={full ? labels.full : labels.addPilot}
              title={
                full
                  ? labels.full
                  : choices.length === 0
                    ? labels.addPilotEmpty
                    : labels.addPilot
              }
            />
          </PersonPicker>
        ) : undefined
      }
    >
      {assigned.length > 0 ? (
        <ul
          aria-busy={pending}
          className="grid gap-1"
        >
          {assigned.map((pilot) => (
            <PanelItem
              key={pilot.id}
              href={pilot.href}
              leading={
                <PersonAvatar
                  svg={pilot.avatar}
                  size="sm"
                  className="size-5"
                />
              }
              label={pilot.name}
              onRemove={
                editable
                  ? () => run(unassignPilotAction, pilot, labels.removed)
                  : undefined
              }
              removeLabel={say(labels.remove, pilot.name)}
              disabled={pending}
            />
          ))}
        </ul>
      ) : (
        <DetailEmpty variant="panel">{labels.emptyPilots}</DetailEmpty>
      )}
    </SidePanel>
  );
}
