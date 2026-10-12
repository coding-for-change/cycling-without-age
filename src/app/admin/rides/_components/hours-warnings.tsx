"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { slotWindow, type WallSlot } from "@/features/rides/schemas";
import { clockRangeLabel } from "@/lib/clock";
import { formatWeekday, wordsLocale, type Locale } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale as Language } from "@/lib/i18n/locales";
import {
  fitsHours,
  windowsOn,
  type OperatingHours,
} from "@/lib/operating-hours";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const HOURS_PER_DAY = 24;

export type HoursPolicy = {
  hours: OperatingHours;
  closureReasons: Record<string, string | null>;
  leadTimeHours: number;
  horizonDays: number;
};

export type HoursWarningStrings = {
  warnings: Dictionary["admin"]["settings"]["hours"]["warnings"];
  hours: string;
  days: string;
};

export function HoursWarnings({
  slot,
  returnSlot,
  timeZone,
  policy,
  notation,
  language,
  strings,
}: {
  slot: WallSlot;
  returnSlot: { startsAt: Date; endsAt: Date } | null;
  timeZone: string;
  policy: HoursPolicy;
  notation: Locale;
  language: Language;
  strings: HoursWarningStrings;
}) {
  const [now] = useState(() => Date.now());
  const words = wordsLocale(language);
  const outbound = slotWindow(slot, timeZone);
  const legs = returnSlot ? [outbound, returnSlot] : [outbound];
  const fits = legs.map((leg) => fitsHours(policy.hours, leg, timeZone));
  const count = (template: string, value: number) =>
    formatMessage(template, { count: value }, words);
  const notice = (hours: number) =>
    hours % HOURS_PER_DAY === 0
      ? count(strings.days, hours / HOURS_PER_DAY)
      : count(strings.hours, hours);

  const messages: string[] = [];
  if (fits.includes("closed")) {
    const reason = policy.closureReasons[slot.date];
    messages.push(
      reason
        ? formatMessage(strings.warnings.closedReason, { reason }, words)
        : strings.warnings.closed,
    );
  } else if (fits.includes("outsideHours")) {
    const day = `${formatWeekday(slot.date, words, "short")} ${windowsOn(
      policy.hours,
      slot.date,
    )
      .map((window) => clockRangeLabel(window.from, window.to, notation))
      .join(", ")}`;
    messages.push(
      formatMessage(strings.warnings.outsideHours, { hours: day }, words),
    );
  }

  const ahead = outbound.startsAt.getTime() - now;
  if (
    ahead > 0 &&
    policy.leadTimeHours > 0 &&
    ahead < policy.leadTimeHours * HOUR_MS
  )
    messages.push(
      formatMessage(
        strings.warnings.shortNotice,
        { notice: notice(policy.leadTimeHours) },
        words,
      ),
    );
  if (ahead > policy.horizonDays * DAY_MS)
    messages.push(
      formatMessage(
        strings.warnings.beyondHorizon,
        { horizon: count(strings.days, policy.horizonDays) },
        words,
      ),
    );

  if (!messages.length) return null;

  return (
    <ul
      aria-live="polite"
      className="grid gap-1 px-2"
    >
      {messages.map((message) => (
        <li
          key={message}
          className="flex items-start gap-2 rounded-md bg-canvas-deep px-2.5 py-1.5 text-2sm text-ink"
        >
          <TriangleAlert
            aria-hidden
            className="mt-0.5 size-3.5 shrink-0 text-ink-soft"
          />
          {message}
        </li>
      ))}
    </ul>
  );
}
