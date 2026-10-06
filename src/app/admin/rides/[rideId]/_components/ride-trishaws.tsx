"use client";

import { useTransition } from "react";
import { Bike } from "lucide-react";
import { notify } from "@/components/action-feedback";
import { PickerPopover } from "@/components/picker-popover";
import { Badge } from "@/components/ui/badge";
import { setRideTrishawsAction } from "@/features/rides/actions";
import { trishawMeta } from "@/features/rides/components/ride-presentation";
import type { TrishawOption } from "@/features/rides/components/trishaw-options";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { DetailEmpty } from "../../../_components/detail-page";
import {
  CountMeta,
  PanelAddButton,
  PanelItem,
  SidePanel,
} from "../../../_components/side-panel";
import type { TrishawPanelLabels } from "./panel-labels";

type Allocated = {
  id: string;
  name: string;
  href: string;
  notReady: boolean;
};

const BIKE = (
  <Bike
    aria-hidden
    className="size-3.5 shrink-0 text-ink-soft"
  />
);

export function RideTrishaws({
  rideId,
  editable,
  allocated,
  options,
  limit,
  language,
  labels,
}: {
  rideId: string;
  editable: boolean;
  allocated: Allocated[];
  options: TrishawOption[];
  limit: number | null;
  language: Locale;
  labels: TrishawPanelLabels;
}) {
  const [pending, startTransition] = useTransition();
  const say = (template: string, name: string) =>
    formatMessage(template, { name }, language);
  const ids = allocated.map((trishaw) => trishaw.id);
  const choices = options.filter((option) => !ids.includes(option.id));
  const single = limit === 1;
  const full = limit !== null && !single && allocated.length >= limit;

  const save = (trishawIds: string[], done: string) =>
    startTransition(async () => {
      const result = await setRideTrishawsAction({ rideId, trishawIds });
      notify(result, { done, errors: labels.errors });
    });

  return (
    <SidePanel
      title={labels.trishaws}
      meta={
        allocated.length > 0 || limit !== null ? (
          <CountMeta
            count={allocated.length}
            max={limit}
            srLabel={formatMessage(
              labels.trishawCount,
              { count: allocated.length },
              language,
            )}
          />
        ) : null
      }
      action={
        editable ? (
          <PickerPopover
            items={choices}
            keywords={(option) => [
              option.name,
              option.model ?? "",
              option.location,
            ]}
            isDisabled={(option) => option.blocked !== null}
            onSelect={(option) =>
              save(
                single ? [option.id] : [...ids, option.id],
                say(labels.added, option.name),
              )
            }
            search={labels.search}
            empty={labels.noMatch}
            className="w-72"
            renderItem={(option) => (
              <>
                {BIKE}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{option.name}</span>
                  <span className="block truncate text-xs text-ink-soft">
                    {option.blocked ?? trishawMeta(option)}
                  </span>
                </span>
              </>
            )}
          >
            <PanelAddButton
              disabled={pending || full || choices.length === 0}
              label={labels.addTrishaw}
              title={
                full
                  ? labels.oneTrishaw
                  : choices.length === 0
                    ? labels.addTrishawEmpty
                    : labels.addTrishaw
              }
            />
          </PickerPopover>
        ) : undefined
      }
    >
      {allocated.length > 0 ? (
        <ul
          aria-busy={pending}
          className="grid gap-1"
        >
          {allocated.map((trishaw) => (
            <PanelItem
              key={trishaw.id}
              href={trishaw.href}
              leading={BIKE}
              label={trishaw.name}
              badge={
                trishaw.notReady ? (
                  <Badge className="bg-paper font-normal text-ink">
                    {labels.notReady}
                  </Badge>
                ) : null
              }
              onRemove={
                editable
                  ? () =>
                      save(
                        ids.filter((id) => id !== trishaw.id),
                        say(labels.removed, trishaw.name),
                      )
                  : undefined
              }
              removeLabel={say(labels.remove, trishaw.name)}
              disabled={pending}
            />
          ))}
        </ul>
      ) : (
        <DetailEmpty variant="panel">{labels.noTrishaws}</DetailEmpty>
      )}
    </SidePanel>
  );
}
