"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { CalendarOff, Copy, Plus, X } from "lucide-react";
import { notify } from "@/components/action-feedback";
import type { InlineFieldLabels } from "@/components/inline-field";
import { SaveStatus, SaveStatusProvider } from "@/components/save-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOptimisticSave } from "@/components/use-optimistic-save";
import {
  OPERATING_HOURS,
  type OperatingWindowInput,
} from "@/features/chapters/schemas";
import type { ChapterClosureRow } from "@/features/chapters/facade";
import { clockRangeLabel, clockToMinutes } from "@/lib/clock";
import { formatDate, type Locale as Notation } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import {
  addClosureAction,
  removeClosureAction,
  setOperatingHoursAction,
} from "../actions";

type Strings = Dictionary["admin"]["settings"]["hours"];

export type WeekdayLabel = { weekday: number; name: string };
export type ClosureLabel = ChapterClosureRow & { label: string };

const TUESDAY_TO_FRIDAY = [2, 3, 4, 5];
const PILL =
  "inline-flex h-8 items-center gap-1 rounded-full bg-mint-tint pr-1 pl-3 text-2sm text-ink tabular-nums";

const sorted = (windows: OperatingWindowInput[]) =>
  windows.toSorted(
    (a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute,
  );

export function OperatingHoursCard({
  chapterId,
  windows,
  closures,
  weekdays,
  notation,
  language,
  labels,
}: {
  chapterId: string;
  windows: OperatingWindowInput[];
  closures: ClosureLabel[];
  weekdays: WeekdayLabel[];
  notation: Notation;
  language: string;
  labels: {
    strings: Strings;
    status: { saving: string; saved: string };
    field: InlineFieldLabels;
  };
}) {
  const { strings } = labels;
  const { shown, persist } = useOptimisticSave(
    windows,
    (next) => setOperatingHoursAction(chapterId, next),
    {
      ...labels.field,
      errors: { ...labels.field.errors, invalidHours: strings.invalid },
    },
  );

  const write = (next: OperatingWindowInput[]) =>
    void persist(sorted(next), shown);

  const remove = (target: OperatingWindowInput) =>
    write(
      shown.filter(
        (window) =>
          window.weekday !== target.weekday ||
          window.startMinute !== target.startMinute,
      ),
    );

  const monday = shown.filter((window) => window.weekday === 1);
  const copyMonday = () =>
    write([
      ...shown.filter((window) => !TUESDAY_TO_FRIDAY.includes(window.weekday)),
      ...TUESDAY_TO_FRIDAY.flatMap((weekday) =>
        monday.map((window) => ({ ...window, weekday })),
      ),
    ]);

  return (
    <SaveStatusProvider>
      <section className="grid gap-3 rounded-2xl border border-line p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg">{strings.title}</h2>
          <SaveStatus
            labels={labels.status}
            words={language}
          />
        </div>
        <p className="max-w-prose text-sm text-ink-soft">{strings.body}</p>
        {shown.length === 0 ? (
          <p className="text-2sm text-ink-soft">{strings.unset}</p>
        ) : null}

        <ul className="grid divide-y divide-line">
          {weekdays.map(({ weekday, name }) => {
            const day = shown.filter((window) => window.weekday === weekday);
            return (
              <li
                key={weekday}
                className="grid gap-2 py-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center"
              >
                <span className="text-sm font-medium">{name}</span>
                <div className="flex flex-wrap items-center gap-1.25">
                  {day.length === 0 ? (
                    <span className="text-2sm text-ink-faint">
                      {strings.closed}
                    </span>
                  ) : null}
                  {day.map((window) => {
                    const range = clockRangeLabel(
                      window.startMinute,
                      window.endMinute,
                      notation,
                    );
                    return (
                      <span
                        key={window.startMinute}
                        className={PILL}
                      >
                        {range}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(window)}
                          aria-label={formatMessage(
                            strings.remove,
                            { range },
                            language,
                          )}
                          className="size-6 rounded-full text-ink-soft hover:bg-mint"
                        >
                          <X aria-hidden />
                        </Button>
                      </span>
                    );
                  })}
                  {day.length < OPERATING_HOURS.maxWindowsPerDay ? (
                    <AddWindow
                      onAdd={(startMinute, endMinute) =>
                        write([...shown, { weekday, startMinute, endMinute }])
                      }
                      strings={strings}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        {monday.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyMonday}
            className="w-fit border-line"
          >
            <Copy aria-hidden />
            {strings.copyMonday}
          </Button>
        ) : null}

        <Closures
          chapterId={chapterId}
          closures={closures}
          notation={notation}
          language={language}
          labels={labels}
        />
      </section>
    </SaveStatusProvider>
  );
}

function AddWindow({
  onAdd,
  strings,
}: {
  onAdd: (startMinute: number, endMinute: number) => void;
  strings: Strings;
}) {
  const fromId = useId();
  const toId = useId();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("09:00");
  const [to, setTo] = useState("12:00");

  const valid =
    /^\d{2}:\d{2}$/.test(from) &&
    /^\d{2}:\d{2}$/.test(to) &&
    clockToMinutes(to) - clockToMinutes(from) >=
      OPERATING_HOURS.minWindowMinutes &&
    clockToMinutes(from) % OPERATING_HOURS.stepMinutes === 0 &&
    clockToMinutes(to) % OPERATING_HOURS.stepMinutes === 0;

  if (!open)
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 rounded-full border border-dashed border-line text-2sm text-ink-soft"
      >
        <Plus aria-hidden />
        {strings.addWindow}
      </Button>
    );

  return (
    <div className="flex flex-wrap items-center gap-1.25">
      <label
        htmlFor={fromId}
        className="sr-only"
      >
        {strings.from}
      </label>
      <Input
        id={fromId}
        type="time"
        step={OPERATING_HOURS.stepMinutes * 60}
        value={from}
        onChange={(event) => setFrom(event.target.value)}
        className="h-8 w-28 border-line text-2sm"
      />
      <span
        aria-hidden
        className="text-ink-soft"
      >
        –
      </span>
      <label
        htmlFor={toId}
        className="sr-only"
      >
        {strings.to}
      </label>
      <Input
        id={toId}
        type="time"
        step={OPERATING_HOURS.stepMinutes * 60}
        value={to}
        onChange={(event) => setTo(event.target.value)}
        aria-invalid={!valid || undefined}
        className="h-8 w-28 border-line text-2sm"
      />
      <Button
        type="button"
        size="sm"
        disabled={!valid}
        onClick={() => {
          onAdd(clockToMinutes(from), clockToMinutes(to));
          setOpen(false);
        }}
        className="h-8"
      >
        {strings.add}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(false)}
        className="h-8 text-ink-soft"
      >
        {strings.cancel}
      </Button>
    </div>
  );
}

function Closures({
  chapterId,
  closures,
  notation,
  language,
  labels,
}: {
  chapterId: string;
  closures: ClosureLabel[];
  notation: Notation;
  language: string;
  labels: {
    strings: Strings;
    field: InlineFieldLabels;
  };
}) {
  const strings = labels.strings.closures;
  const dateId = useId();
  const reasonId = useId();
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const errors = labels.field.errors;

  const add = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!date || pending) return;
    startTransition(async () => {
      const result = await addClosureAction(chapterId, {
        date,
        reason: reason.trim() || null,
      });
      notify(result, {
        done: formatMessage(
          strings.added,
          { date: formatDate(date, notation) },
          language,
        ),
        errors,
      });
      if (result.ok) {
        setDate("");
        setReason("");
      }
    });
  };

  const remove = (closure: ClosureLabel) =>
    startTransition(async () => {
      const result = await removeClosureAction(chapterId, closure.id);
      notify(result, {
        done: formatMessage(strings.removed, { date: closure.label }, language),
        errors,
      });
    });

  return (
    <div className="grid gap-3 border-t border-line pt-4">
      <div className="grid gap-1">
        <h3 className="text-base">{strings.title}</h3>
        <p className="max-w-prose text-2sm text-ink-soft">{strings.body}</p>
      </div>

      {closures.length > 0 ? (
        <ul
          aria-busy={pending}
          className={cn(
            "grid divide-y divide-line overflow-hidden rounded-lg border border-line",
            pending && "opacity-60",
          )}
        >
          {closures.map((closure) => (
            <li
              key={closure.id}
              className="flex min-h-10 items-center gap-3 px-3 py-1.5 text-2sm"
            >
              <CalendarOff
                aria-hidden
                className="size-4 shrink-0 text-ink-soft"
              />
              <span className="shrink-0 font-medium tabular-nums">
                {closure.label}
              </span>
              <span className="min-w-0 flex-1 truncate text-ink-soft">
                {closure.reason}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={pending}
                onClick={() => remove(closure)}
                aria-label={formatMessage(
                  strings.remove,
                  { date: closure.label },
                  language,
                )}
                className="size-8 text-ink-soft"
              >
                <X aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-2sm text-ink-faint">{strings.empty}</p>
      )}

      <form
        onSubmit={add}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="grid gap-1">
          <label
            htmlFor={dateId}
            className="text-2sm text-ink-soft"
          >
            {strings.date}
          </label>
          <Input
            id={dateId}
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-9 w-44 border-line text-2sm"
          />
        </div>
        <div className="grid min-w-48 flex-1 gap-1">
          <label
            htmlFor={reasonId}
            className="text-2sm text-ink-soft"
          >
            {strings.reason}
          </label>
          <Input
            id={reasonId}
            maxLength={OPERATING_HOURS.closureReasonMax}
            placeholder={strings.reasonPlaceholder}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="h-9 border-line text-2sm"
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={!date || pending}
          className="h-9 border-line"
        >
          <Plus aria-hidden />
          {strings.add}
        </Button>
      </form>
    </div>
  );
}
