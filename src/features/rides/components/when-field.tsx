"use client";

import { useState } from "react";
import { da, de, enGB, enUS } from "react-day-picker/locale";
import { CalendarDays, ChevronDown, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CLOCK_STEP_MINUTES,
  CLOCK_STEPS,
  clockLabel,
  clockRangeLabel,
  clockToMinutes,
  minutesToClock,
} from "@/lib/clock";
import {
  formatDuration,
  formatLongDateWithWeekday,
  formatShortDateWithWeekday,
  toIsoDateLocal,
  wordsLocale,
  type Locale,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { RIDE_MAX_MINUTES, RIDE_MIN_MINUTES, type WallSlot } from "../schemas";

export type WhenFieldStrings = {
  label: string;
  date: string;
  start: string;
  end: string;
  search: string;
};

const asLocalDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const pickerLocale = (language: string, notation: Locale) =>
  language === "de"
    ? de
    : language === "da"
      ? da
      : notation === "en-US"
        ? enUS
        : enGB;

export function WhenField({
  value,
  onChange,
  timeZone,
  locale,
  language,
  strings,
  defaultExpanded = false,
  disabled = false,
  className,
}: {
  value: WallSlot;
  onChange: (slot: WallSlot) => void;
  timeZone: string;
  locale: Locale;
  language: string;
  strings: WhenFieldStrings;
  defaultExpanded?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const words = wordsLocale(language);
  const startMinutes = clockToMinutes(value.start);
  const endMinutes = startMinutes + value.durationMinutes;
  const range = clockRangeLabel(startMinutes, endMinutes, locale);
  const duration = formatDuration(value.durationMinutes * 60, words);
  const zone = timeZone.replaceAll("_", " ");

  if (!expanded)
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setExpanded(true)}
        aria-label={`${strings.label}: ${formatLongDateWithWeekday(value.date, locale)}, ${range}`}
        className={cn(
          "flex w-full min-w-0 items-start gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
      >
        <Clock
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-ink-soft"
        />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm text-ink">
            {formatLongDateWithWeekday(value.date, locale)}
            <span className="ml-3 tabular-nums">{range}</span>
          </span>
          <span className="truncate text-xs text-ink-soft">
            {zone} · {duration}
          </span>
        </span>
      </button>
    );

  return (
    <div
      role="group"
      aria-label={strings.label}
      className={cn("flex min-w-0 items-start gap-3 px-2 py-1.5", className)}
    >
      <Clock
        aria-hidden
        className="mt-2 size-4 shrink-0 text-ink-soft"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <DateChip
            value={value.date}
            onChange={(date) => onChange({ ...value, date })}
            locale={locale}
            language={language}
            label={strings.date}
            disabled={disabled}
          />
          <TimeChip
            label={strings.start}
            search={strings.search}
            current={startMinutes}
            disabled={disabled}
            options={CLOCK_STEPS.map((minutes) => ({
              minutes,
              label: clockLabel(minutes, locale),
              hint: null,
            }))}
            onPick={(minutes) =>
              onChange({ ...value, start: minutesToClock(minutes) })
            }
          />
          <span
            aria-hidden
            className="text-ink-soft"
          >
            –
          </span>
          <TimeChip
            label={strings.end}
            search={strings.search}
            current={endMinutes}
            disabled={disabled}
            options={Array.from(
              {
                length:
                  (RIDE_MAX_MINUTES - RIDE_MIN_MINUTES) / CLOCK_STEP_MINUTES +
                  1,
              },
              (_, index) => {
                const length = RIDE_MIN_MINUTES + index * CLOCK_STEP_MINUTES;
                return {
                  minutes: startMinutes + length,
                  label: clockLabel(startMinutes + length, locale),
                  hint: formatDuration(length * 60, words),
                };
              },
            )}
            onPick={(minutes) =>
              onChange({ ...value, durationMinutes: minutes - startMinutes })
            }
          />
        </div>
        <span className="truncate text-xs text-ink-soft">
          {zone} · {duration}
        </span>
      </div>
    </div>
  );
}

const CHIP =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-2sm tabular-nums transition-colors hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-canvas-deep";

function DateChip({
  value,
  onChange,
  locale,
  language,
  label,
  disabled,
}: {
  value: string;
  onChange: (date: string) => void;
  locale: Locale;
  language: string;
  label: string;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = asLocalDate(value);
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={`${label}: ${formatLongDateWithWeekday(value, locale)}`}
          className={CHIP}
        >
          <CalendarDays
            aria-hidden
            className="size-3.5 text-ink-soft"
          />
          {formatShortDateWithWeekday(value, locale)}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto rounded-xl border-line p-0"
      >
        <Calendar
          mode="single"
          required
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (!date) return;
            onChange(toIsoDateLocal(date));
            setOpen(false);
          }}
          locale={pickerLocale(language, locale)}
          weekStartsOn={1}
        />
      </PopoverContent>
    </Popover>
  );
}

type TimeOption = { minutes: number; label: string; hint: string | null };

function TimeChip({
  label,
  search,
  current,
  options,
  onPick,
  disabled,
}: {
  label: string;
  search: string;
  current: number;
  options: TimeOption[];
  onPick: (minutes: number) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const chosen = options.find((option) => option.minutes === current);
  const nearest =
    chosen ??
    options.reduce(
      (best, option) =>
        Math.abs(option.minutes - current) < Math.abs(best.minutes - current)
          ? option
          : best,
      options[0],
    );

  const reveal = (list: HTMLDivElement | null) => {
    if (!list) return;
    requestAnimationFrame(() =>
      list
        .querySelector('[data-current="true"]')
        ?.scrollIntoView({ block: "center" }),
    );
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={`${label}: ${chosen?.label ?? nearest.label}`}
          className={CHIP}
        >
          {chosen?.label ?? nearest.label}
          <ChevronDown
            aria-hidden
            className="size-3.5 text-ink-soft"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-56 rounded-xl border-line p-0"
      >
        <Command
          defaultValue={String(nearest.minutes)}
          className="rounded-xl bg-transparent"
        >
          <CommandInput
            placeholder={search}
            className="h-9 text-2sm md:text-2sm"
          />
          <CommandList
            ref={reveal}
            className="max-h-64"
          >
            <CommandGroup className="p-1">
              {options.map((option) => (
                <CommandItem
                  key={option.minutes}
                  value={String(option.minutes)}
                  keywords={[option.label, minutesToClock(option.minutes)]}
                  data-current={option.minutes === nearest.minutes}
                  onSelect={() => {
                    onPick(option.minutes);
                    setOpen(false);
                  }}
                  className={cn(
                    "min-h-8 gap-2 rounded-lg px-2 text-2sm tabular-nums data-[selected=true]:bg-canvas-deep",
                    option.minutes === current && "font-medium",
                  )}
                >
                  <span className="flex-1">{option.label}</span>
                  {option.hint ? (
                    <span className="text-xs text-ink-soft">{option.hint}</span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
