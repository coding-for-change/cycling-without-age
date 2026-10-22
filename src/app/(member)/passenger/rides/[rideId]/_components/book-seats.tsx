"use client";

import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { notify, type NotifyLabels } from "@/components/action-feedback";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { bookEventSeatsAction } from "../../actions";

export type BookSeatsLabels = {
  title: string;
  hint: string;
  submit: string;
  done: string;
  pick: string;
  tooMany: string;
  errors: NotifyLabels["errors"];
};

/**
 * Seats on an announced event for the riders this account books for, always
 * named so it is clear who is booked. A lone rider starts ticked; with
 * several, the account picks who comes along. A booking shrinks the list, so
 * only riders still on it count as chosen.
 */
export function BookSeats({
  rideId,
  riders,
  seatsLeft,
  language,
  labels,
  onBooked,
  bare = false,
}: {
  rideId: string;
  riders: { id: string; name: string }[];
  seatsLeft: number | null;
  language: Locale;
  labels: BookSeatsLabels;
  onBooked?: () => void;
  bare?: boolean;
}) {
  const headingId = useId();
  const [picked, setPicked] = useState<ReadonlySet<string>>(
    () => new Set(riders.length === 1 ? [riders[0].id] : []),
  );
  const chosen = new Set(
    riders.filter((rider) => picked.has(rider.id)).map((rider) => rider.id),
  );
  const [pending, startTransition] = useTransition();
  const tooMany = seatsLeft !== null && chosen.size > seatsLeft;

  const toggle = (id: string, on: boolean) =>
    setPicked((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const book = () =>
    startTransition(async () => {
      const result = await bookEventSeatsAction({
        rideId,
        passengerIds: [...chosen],
      });
      if (result.ok) {
        setPicked(new Set());
        onBooked?.();
      }
      notify(result, {
        done: formatMessage(
          labels.done,
          { count: result.ok ? result.booked : chosen.size },
          language,
        ),
        errors: labels.errors,
      });
    });

  return (
    <section
      aria-labelledby={bare ? undefined : headingId}
      aria-label={bare ? labels.title : undefined}
      className="flex flex-col gap-3"
    >
      {bare ? null : (
        <div className="flex flex-col gap-1">
          <h2
            id={headingId}
            className="text-ink-soft text-xs font-semibold tracking-wide uppercase"
          >
            {labels.title}
          </h2>
          <p className="text-2sm text-ink-soft">{labels.hint}</p>
        </div>
      )}
      <ul className="border-line divide-line divide-y rounded-2xl border">
        {riders.map((rider) => (
          <li key={rider.id}>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 px-4 py-3">
              <Checkbox
                checked={chosen.has(rider.id)}
                onCheckedChange={(next) => toggle(rider.id, next === true)}
                disabled={pending}
              />
              <span className="min-w-0 truncate font-medium">{rider.name}</span>
            </label>
          </li>
        ))}
      </ul>
      <Button
        variant="brand"
        size="hero"
        disabled={pending || chosen.size === 0 || tooMany}
        aria-busy={pending}
        onClick={book}
      >
        {chosen.size === 0
          ? labels.pick
          : tooMany
            ? formatMessage(labels.tooMany, { count: seatsLeft }, language)
            : formatMessage(labels.submit, { count: chosen.size }, language)}
      </Button>
    </section>
  );
}
