"use client";

import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { da, de, enGB, enUS } from "react-day-picker/locale";
import {
  CalendarRange,
  Check,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ICONS } from "@/components/icons";
import {
  REPORT_RANGE_PRESETS,
  type ReportRangePreset,
} from "@/features/rides/report-range";
import type { ScopeArg } from "@/lib/commands";
import { formatMessage } from "@/lib/i18n/format";
import {
  formatPeriod,
  formatTime,
  toIsoDateLocal,
  type Locale,
} from "@/lib/format";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";
import type { ScopeChoice } from "../../scopes";
import { useReportNav } from "./report-nav";

export type FilterBarStrings = {
  label: string;
  timeframe: string;
  presets: Record<ReportRangePreset, string>;
  presetNames: Record<ReportRangePreset, string>;
  custom: string;
  customTitle: string;
  apply: string;
  cancel: string;
  scope: string;
  open: string;
  sheetTitle: string;
  period: string;
  comparing: string;
  updated: string;
};

type Preset = ReportRangePreset | "custom";

const isPreset = (value: string | null): value is ReportRangePreset =>
  REPORT_RANGE_PRESETS.includes(value as ReportRangePreset);

const pickerLocale = (language: string, notation: Locale) =>
  language === "de"
    ? de
    : language === "da"
      ? da
      : notation === "en-US"
        ? enUS
        : enGB;

const asDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export function FilterBar({
  range,
  previous,
  scopes,
  activeScope,
  generatedAt,
  timeZone,
  locale,
  language,
  strings,
}: {
  range: { preset: Preset; from: string; last: string };
  previous: { from: string; last: string };
  scopes: ScopeChoice[];
  activeScope: ScopeArg;
  generatedAt: string;
  timeZone: string;
  locale: Locale;
  language: string;
  strings: FilterBarStrings;
}) {
  const nav = useReportNav();
  const query = nav?.query;
  const requested = query?.get("range") ?? null;
  const optimistic: Preset =
    query?.get("from") && query.get("to")
      ? "custom"
      : isPreset(requested)
        ? requested
        : "30d";
  const preset: Preset = nav?.pending ? optimistic : range.preset;

  const current = formatMessage(
    strings.period,
    formatPeriod(range.from, range.last, locale),
    locale,
  );
  const comparing = formatMessage(
    strings.comparing,
    formatPeriod(previous.from, previous.last, locale),
    locale,
  );

  const choosePreset = (next: ReportRangePreset) => {
    if (next === preset) return;
    haptics.selectionChanged();
    nav?.navigate({
      range: next === "30d" ? null : next,
      from: null,
      to: null,
    });
  };

  const applyCustom = (picked: DateRange) => {
    if (!picked.from) return;
    nav?.navigate({
      range: null,
      from: toIsoDateLocal(picked.from),
      to: toIsoDateLocal(picked.to ?? picked.from),
    });
  };

  const segmented = (
    <Segmented
      value={preset}
      onChange={choosePreset}
      strings={strings}
    />
  );

  const custom = (
    <CustomRange
      active={preset === "custom"}
      label={preset === "custom" ? current : strings.custom}
      initial={{ from: asDate(range.from), to: asDate(range.last) }}
      dayPickerLocale={pickerLocale(language, locale)}
      onApply={applyCustom}
      strings={strings}
    />
  );

  const scope =
    scopes.length > 1 ? (
      <ScopeMenu
        scopes={scopes}
        active={activeScope}
        onSelect={(arg) => nav?.switchScope(arg)}
        label={strings.scope}
      />
    ) : null;

  return (
    <div
      role="toolbar"
      aria-label={strings.label}
      className="sticky top-[env(safe-area-inset-top,0px)] z-20 -mx-4 border-b border-line bg-canvas/90 px-4 py-2 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/75 lg:-mx-6 lg:px-6"
    >
      <div className="hidden items-center gap-3 md:flex">
        {segmented}
        {custom}
        <p
          className="min-w-0 truncate text-xs text-ink-soft"
          title={comparing}
        >
          <span className="text-ink">{current}</span>
          <span className="hidden xl:inline"> · {comparing}</span>
        </p>
        <div className="ml-auto flex items-center gap-3">
          <time
            dateTime={generatedAt}
            className="hidden text-xs text-ink-faint lg:block"
          >
            {formatMessage(
              strings.updated,
              { time: formatTime(generatedAt, locale, timeZone) },
              locale,
            )}
          </time>
          {scope}
        </div>
      </div>

      <div className="flex items-center gap-3 md:hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-2sm font-medium">
            {preset === "custom" ? current : strings.presetNames[preset]}
          </span>
          <span className="truncate text-xs text-ink-soft">
            {preset === "custom" ? comparing : current}
          </span>
        </div>
        <Drawer>
          <DrawerTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-full border-line"
            >
              <SlidersHorizontal
                aria-hidden
                className="size-4"
              />
              {strings.open}
            </Button>
          </DrawerTrigger>
          <DrawerContent className="pb-safe">
            <DrawerHeader className="text-left">
              <DrawerTitle>{strings.sheetTitle}</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-5 overflow-y-auto px-4 pb-5">
              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-medium text-ink-soft">
                  {strings.timeframe}
                </h3>
                <Segmented
                  value={preset}
                  onChange={choosePreset}
                  strings={strings}
                  wide
                />
              </section>
              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-medium text-ink-soft">
                  {strings.custom}
                </h3>
                <CustomRangePicker
                  initial={{ from: asDate(range.from), to: asDate(range.last) }}
                  dayPickerLocale={pickerLocale(language, locale)}
                  onApply={applyCustom}
                  strings={strings}
                  months={1}
                />
              </section>
              {scopes.length > 1 ? (
                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-medium text-ink-soft">
                    {strings.scope}
                  </h3>
                  <ul className="flex flex-col gap-1">
                    {scopes.map((option) => {
                      const selected = option.arg === activeScope;
                      return (
                        <li key={option.arg}>
                          <button
                            type="button"
                            aria-current={selected ? "true" : undefined}
                            onClick={() => {
                              if (!selected) nav?.switchScope(option.arg);
                            }}
                            className={cn(
                              "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm",
                              selected
                                ? "bg-canvas-deep"
                                : "hover:bg-canvas-deep",
                            )}
                          >
                            <ScopeOption
                              option={option}
                              selected={selected}
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}

function Segmented({
  value,
  onChange,
  strings,
  wide = false,
}: {
  value: Preset;
  onChange: (preset: ReportRangePreset) => void;
  strings: FilterBarStrings;
  wide?: boolean;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value === "custom" ? "" : value}
      onValueChange={(next) => {
        if (isPreset(next)) onChange(next);
      }}
      aria-label={strings.timeframe}
      spacing={0.5}
      className={cn(
        "shrink-0 rounded-lg bg-canvas-deep p-0.5",
        wide && "grid w-full grid-cols-6",
      )}
    >
      {REPORT_RANGE_PRESETS.map((preset) => (
        <ToggleGroupItem
          key={preset}
          value={preset}
          title={strings.presetNames[preset]}
          aria-label={strings.presetNames[preset]}
          className={cn(
            "h-7 min-w-0 rounded-md px-2.5 text-xs font-medium text-ink-soft tabular-nums transition-[background-color,color,box-shadow] hover:bg-transparent hover:text-ink focus-visible:ring-2 focus-visible:ring-ink data-[state=on]:bg-canvas data-[state=on]:text-ink data-[state=on]:shadow-xs",
            wide && "h-9",
          )}
        >
          {strings.presets[preset]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

type PickerLocale = ReturnType<typeof pickerLocale>;

function CustomRange({
  active,
  label,
  initial,
  dayPickerLocale,
  onApply,
  strings,
}: {
  active: boolean;
  label: string;
  initial: DateRange;
  dayPickerLocale: PickerLocale;
  onApply: (range: DateRange) => void;
  strings: FilterBarStrings;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-2 rounded-lg border-line text-xs",
            active ? "bg-canvas-deep text-ink" : "text-ink-soft",
          )}
        >
          <CalendarRange
            aria-hidden
            className="size-3.5"
          />
          <span className="max-w-48 truncate">{label}</span>
          <ChevronDown
            aria-hidden
            className="size-3.5"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto rounded-2xl border-line p-0"
      >
        <CustomRangePicker
          initial={initial}
          dayPickerLocale={dayPickerLocale}
          onApply={(range) => {
            setOpen(false);
            onApply(range);
          }}
          onCancel={() => setOpen(false)}
          strings={strings}
          months={2}
        />
      </PopoverContent>
    </Popover>
  );
}

function CustomRangePicker({
  initial,
  dayPickerLocale,
  onApply,
  onCancel,
  strings,
  months,
}: {
  initial: DateRange;
  dayPickerLocale: PickerLocale;
  onApply: (range: DateRange) => void;
  onCancel?: () => void;
  strings: FilterBarStrings;
  months: number;
}) {
  const [picked, setPicked] = useState<DateRange | undefined>(initial);
  const [today] = useState(() => new Date());

  return (
    <div className="flex flex-col">
      <p className="px-4 pt-3 text-2sm font-medium">{strings.customTitle}</p>
      <Calendar
        mode="range"
        numberOfMonths={months}
        selected={picked}
        onSelect={setPicked}
        defaultMonth={
          months > 1 && initial.to
            ? new Date(initial.to.getFullYear(), initial.to.getMonth() - 1, 1)
            : initial.to
        }
        locale={dayPickerLocale}
        weekStartsOn={1}
        disabled={{ after: today }}
        startMonth={new Date(2015, 0, 1)}
        endMonth={today}
        className="mx-auto"
      />
      <div className="flex justify-end gap-2 border-t border-line px-3 py-3">
        {onCancel ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
          >
            {strings.cancel}
          </Button>
        ) : null}
        <Button
          size="sm"
          disabled={!picked?.from}
          onClick={() => picked && onApply(picked)}
        >
          {strings.apply}
        </Button>
      </div>
    </div>
  );
}

function ScopeMenu({
  scopes,
  active,
  onSelect,
  label,
}: {
  scopes: ScopeChoice[];
  active: ScopeArg;
  onSelect: (arg: ScopeArg) => void;
  label: string;
}) {
  const current = scopes.find((option) => option.arg === active) ?? scopes[0];
  const CurrentIcon = ICONS[current.icon];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={label}
          className="h-8 max-w-56 gap-2 rounded-lg border-line text-xs"
        >
          <CurrentIcon
            aria-hidden
            className="size-3.5 text-ink-soft"
          />
          <span className="truncate">{current.label}</span>
          <ChevronDown
            aria-hidden
            className="size-3.5 text-ink-soft"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-96 min-w-64 rounded-2xl border-line p-2"
      >
        <DropdownMenuLabel className="text-xs text-ink-soft">
          {label}
        </DropdownMenuLabel>
        {scopes.map((option) => {
          const selected = option.arg === active;
          return (
            <DropdownMenuItem
              key={option.arg}
              aria-current={selected ? "true" : undefined}
              onSelect={() => {
                if (!selected) onSelect(option.arg);
              }}
              className="gap-3 rounded-xl py-2.5"
            >
              <ScopeOption
                option={option}
                selected={selected}
              />
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ScopeOption({
  option,
  selected,
}: {
  option: ScopeChoice;
  selected: boolean;
}) {
  const Icon = ICONS[option.icon];
  return (
    <>
      <Icon
        aria-hidden
        className="size-4 text-ink-soft"
      />
      <span className="truncate">{option.label}</span>
      {selected ? (
        <Check
          aria-hidden
          className="ml-auto size-4 shrink-0"
        />
      ) : null}
    </>
  );
}
