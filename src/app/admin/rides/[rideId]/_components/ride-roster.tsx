"use client";

import { useState, useTransition } from "react";
import { GripVertical, Plus, UserPlus } from "lucide-react";
import { notify, reportSave } from "@/components/action-feedback";
import { PersonPicker, type PersonOption } from "@/components/people-picker";
import { PersonChip } from "@/components/person-avatar";
import { useSaveStatus } from "@/components/save-status";
import { Button } from "@/components/ui/button";
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
  SortableOverlay,
} from "@/components/ui/sortable";
import {
  bookRiderAction,
  removeRiderAction,
  reorderRosterAction,
} from "@/features/rides/actions";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";
import {
  DetailEmpty,
  DetailList,
  DetailListRow,
  DetailSection,
} from "../../../_components/detail-page";
import {
  CountMeta,
  PanelAddButton,
  RowRemoveButton,
} from "../../../_components/side-panel";
import type { RosterLabels } from "./panel-labels";

type Person = {
  id: string;
  name: string;
  avatar: string;
  href: string | null;
};

type PickStrings = { search: string; empty: string };

const sameOrder = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id, index) => id === b[index]);

export function RideRoster({
  rideId,
  editable,
  riders,
  choices,
  limit,
  language,
  labels,
  pick,
}: {
  rideId: string;
  editable: boolean;
  riders: Person[];
  choices: PersonOption[];
  limit: number | null;
  language: Locale;
  labels: RosterLabels;
  pick: PickStrings;
}) {
  const report = useSaveStatus();
  const [pending, startTransition] = useTransition();
  const [dragging, setDragging] = useState(false);
  const serverOrder = riders.map((rider) => rider.id);
  const [order, setOrder] = useState(serverOrder);
  const [synced, setSynced] = useState(serverOrder);
  if (!sameOrder(synced, serverOrder)) {
    setSynced(serverOrder);
    setOrder(serverOrder);
  }

  const byId = new Map(riders.map((rider) => [rider.id, rider]));
  const shown = order.flatMap((id) => byId.get(id) ?? []);
  const count = riders.length;
  const full = limit !== null && count >= limit;
  const canAdd = editable && !full && choices.length > 0;
  const say = (template: string, name: string) =>
    formatMessage(template, { name }, language);

  const book = (rider: PersonOption, position?: number) =>
    startTransition(async () => {
      const result = await bookRiderAction({
        rideId,
        passengerId: rider.id,
        position,
      });
      notify(result, {
        done:
          result.ok && !result.changed
            ? labels.unchanged
            : say(labels.riderAdded, rider.name),
        errors: labels.errors,
      });
    });

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
            : say(labels.removed, rider.name),
        errors: labels.errors,
      });
    });

  const reorder = (next: string[], previous: string[], undoing = false) => {
    setOrder(next);
    report("saving");
    startTransition(async () => {
      const result = await reorderRosterAction({ rideId, passengerIds: next });
      const ok = reportSave(result, {
        report,
        labels,
        undo: undoing ? undefined : () => reorder(previous, next, true),
        undoing,
      });
      if (!ok) setOrder(previous);
    });
  };

  return (
    <DetailSection
      title={labels.riders}
      description={
        count > 0
          ? formatMessage(labels.ridersCount, { count }, language)
          : undefined
      }
      meta={
        limit !== null ? (
          <CountMeta
            count={count}
            max={limit}
            highlight={full}
            srLabel={formatMessage(
              labels.placesTaken,
              { count, max: limit },
              language,
            )}
          />
        ) : null
      }
      action={
        editable && count > 0 ? (
          <PersonPicker
            options={choices}
            onPick={(rider) => book(rider)}
            strings={pick}
          >
            <PanelAddButton
              disabled={!canAdd || pending}
              label={full ? labels.full : labels.addRider}
            />
          </PersonPicker>
        ) : null
      }
      busy={pending}
      className="gap-3"
    >
      {count === 0 ? (
        <DetailEmpty
          action={
            editable ? (
              <PersonPicker
                options={choices}
                onPick={(rider) => book(rider)}
                strings={pick}
                align="center"
              >
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canAdd || pending}
                  className="h-8 border-line text-2sm"
                >
                  <UserPlus aria-hidden />
                  {labels.addRiderFirst}
                </Button>
              </PersonPicker>
            ) : null
          }
        >
          {labels.emptyRiders}
        </DetailEmpty>
      ) : editable ? (
        <Sortable
          value={order}
          onValueChange={(next) => {
            if (!sameOrder(next, order)) reorder(next, order);
          }}
          onDragStart={() => setDragging(true)}
          onDragEnd={() => setDragging(false)}
          onDragCancel={() => setDragging(false)}
        >
          <SortableContent
            render={<ol />}
            className="grid rounded-lg border border-line"
          >
            {shown.map((rider, index) => (
              <SortableItem
                key={rider.id}
                value={rider.id}
                render={<li />}
                className={cn(
                  "group/row relative flex min-h-10 items-center gap-3 bg-canvas px-3 first:rounded-t-lg last:rounded-b-lg",
                  index > 0 && "border-t border-line",
                )}
              >
                <RiderRow
                  rider={rider}
                  index={index}
                  handleLabel={say(labels.dragRider, rider.name)}
                  removeLabel={say(labels.remove, rider.name)}
                  disabled={pending}
                  onRemove={() => remove(rider)}
                />
                {canAdd && !dragging ? (
                  <InsertRow
                    label={labels.addRiderHere}
                    choices={choices}
                    pick={pick}
                    disabled={pending}
                    onPick={(choice) => book(choice, index + 1)}
                  />
                ) : null}
              </SortableItem>
            ))}
          </SortableContent>
          <SortableOverlay>
            {({ value }) => {
              const rider = byId.get(String(value));
              return rider ? (
                <div className="flex min-h-10 items-center gap-3 rounded-lg border border-line bg-canvas px-3 shadow-lift">
                  <GripVertical
                    aria-hidden
                    className="size-4 text-ink-soft"
                  />
                  <PersonChip {...rider} />
                </div>
              ) : null;
            }}
          </SortableOverlay>
        </Sortable>
      ) : (
        <DetailList ordered>
          {shown.map((rider, index) => (
            <DetailListRow key={rider.id}>
              <span className="w-4 shrink-0 text-right text-ink-faint tabular-nums">
                {index + 1}
              </span>
              <PersonChip {...rider} />
            </DetailListRow>
          ))}
        </DetailList>
      )}
    </DetailSection>
  );
}

function RiderRow({
  rider,
  index,
  handleLabel,
  removeLabel,
  disabled,
  onRemove,
}: {
  rider: Person;
  index: number;
  handleLabel: string;
  removeLabel: string;
  disabled: boolean;
  onRemove: () => void;
}) {
  return (
    <>
      <span className="relative flex w-4 shrink-0 justify-end">
        <span className="text-2sm text-ink-faint tabular-nums transition-opacity group-hover/row:opacity-0 group-has-[:focus-visible]/row:opacity-0 pointer-coarse:opacity-0">
          {index + 1}
        </span>
        <SortableItemHandle
          aria-label={handleLabel}
          className="absolute inset-y-0 -right-0.5 my-auto flex size-5 items-center justify-center rounded text-ink-soft opacity-0 transition-opacity group-hover/row:opacity-100 hover:text-ink focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none pointer-coarse:opacity-100"
        >
          <GripVertical
            aria-hidden
            className="size-4"
          />
        </SortableItemHandle>
      </span>
      <PersonChip {...rider} />
      <RowRemoveButton
        label={removeLabel}
        disabled={disabled}
        onClick={onRemove}
      />
    </>
  );
}

function InsertRow({
  label,
  choices,
  pick,
  disabled,
  onPick,
}: {
  label: string;
  choices: PersonOption[];
  pick: PickStrings;
  disabled: boolean;
  onPick: (choice: PersonOption) => void;
}) {
  return (
    <div className="absolute inset-x-0 -bottom-2 z-10 h-4">
      <PersonPicker
        options={choices}
        onPick={onPick}
        strings={pick}
        align="start"
      >
        <button
          type="button"
          disabled={disabled}
          className="group/insert flex size-full items-center gap-2 px-3 opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none data-[state=open]:opacity-100"
        >
          <span className="flex h-5 shrink-0 items-center gap-1 rounded-full border border-line bg-canvas px-2 text-xs text-ink-soft group-hover/insert:text-ink">
            <Plus
              aria-hidden
              className="size-3"
            />
            {label}
          </span>
          <span
            aria-hidden
            className="h-px flex-1 bg-ink-faint"
          />
        </button>
      </PersonPicker>
    </div>
  );
}
