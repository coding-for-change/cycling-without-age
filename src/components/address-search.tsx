"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { House, Loader2, MapPin, Search, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { PlaceSuggestion } from "@/lib/mapbox";

const DEBOUNCE_MS = 250;
const MIN_CHARS = 3;

export type AddressSearchStrings = {
  label: string;
  placeholder: string;
  hint: string;
  searching: string;
  noResults: string;
};

export type AddressShortcut = {
  id: string;
  name: string;
  hint: string;
  keywords?: string;
  onPick: () => void;
};

/**
 * Debounced Mapbox lookup over whichever Server Action the caller hands in, so
 * the same box serves the passenger's home and an admin placing a chapter.
 */
export function AddressSearch({
  search,
  strings,
  onPick,
  autoFocus,
  defaultQuery = "",
  inputClassName,
  variant = "inline",
  shortcuts = [],
}: {
  search: (query: string) => Promise<PlaceSuggestion[]>;
  strings: AddressSearchStrings;
  onPick: (suggestion: PlaceSuggestion) => void;
  autoFocus?: boolean;
  /** The address already on record — shown, selected on focus, never searched for. */
  defaultQuery?: string;
  inputClassName?: string;
  variant?: "inline" | "popover";
  shortcuts?: AddressShortcut[];
}) {
  const listId = useId();
  const inputId = useId();
  const [query, setQuery] = useState(defaultQuery);
  const [typed, setTyped] = useState(false);
  const [results, setResults] = useState<PlaceSuggestion[] | null>(null);
  const [searching, setSearching] = useState(false);
  const latest = useRef(0);
  // Callers pass an inline closure; a fresh identity must not restart the
  // debounce mid-word.
  const lookup = useRef(search);
  useEffect(() => {
    lookup.current = search;
  }, [search]);

  useEffect(() => {
    const term = query.trim();
    // Claimed before the short-query return, so clearing the box also retires
    // a request still in flight for the previous text.
    const ticket = ++latest.current;
    if (!typed || term.length < MIN_CHARS) return;

    const timer = setTimeout(async () => {
      const found = await lookup.current(term);
      if (ticket !== latest.current) return;
      setResults(found);
      setSearching(false);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, typed]);

  const onType = (next: string) => {
    setTyped(true);
    setQuery(next);
    const short = next.trim().length < MIN_CHARS;
    if (short) setResults(null);
    setSearching(!short);
  };

  const reset = () => {
    latest.current++;
    setQuery("");
    setTyped(false);
    setResults(null);
    setSearching(false);
  };

  const pick = (suggestion: PlaceSuggestion) => {
    reset();
    onPick(suggestion);
  };

  const term = typed ? query.trim().toLocaleLowerCase() : "";
  const pinned = term
    ? shortcuts.filter((shortcut) =>
        `${shortcut.name} ${shortcut.keywords ?? ""}`
          .toLocaleLowerCase()
          .includes(term),
      )
    : shortcuts;

  if (variant === "popover")
    return (
      <PopoverAddressSearch
        listId={listId}
        inputId={inputId}
        query={query}
        results={results}
        searching={searching}
        strings={strings}
        autoFocus={autoFocus}
        selectOnFocus={Boolean(defaultQuery)}
        inputClassName={inputClassName}
        onType={onType}
        onPick={pick}
        pinned={pinned}
        onShortcut={(shortcut) => {
          reset();
          shortcut.onPick();
        }}
      />
    );

  return (
    <div>
      <label
        htmlFor={inputId}
        className="sr-only"
      >
        {strings.label}
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ink-faint"
          aria-hidden
        />
        <Input
          id={inputId}
          role="combobox"
          aria-expanded={Boolean(results?.length)}
          aria-controls={listId}
          aria-autocomplete="list"
          value={query}
          onChange={(event) => onType(event.target.value)}
          onFocus={defaultQuery ? (event) => event.target.select() : undefined}
          placeholder={strings.placeholder}
          autoComplete="off"
          autoFocus={autoFocus}
          className={cn(
            "h-12 rounded-full border-line pl-11 text-base",
            inputClassName,
          )}
        />
        {searching && (
          <Loader2
            className="absolute top-1/2 right-4 size-4 -translate-y-1/2 animate-spin text-ink-faint motion-reduce:animate-none"
            aria-label={strings.searching}
          />
        )}
      </div>

      <p
        aria-live="polite"
        className="mt-2 px-1 text-sm text-ink-soft"
      >
        {results?.length === 0 ? strings.noResults : strings.hint}
      </p>

      {Boolean(results?.length) && (
        <ul
          id={listId}
          role="listbox"
          aria-label={strings.label}
          className="mt-1 space-y-1"
        >
          {results?.map((suggestion) => (
            <li
              key={suggestion.id}
              role="option"
              aria-selected={false}
            >
              <button
                type="button"
                onClick={() => pick(suggestion)}
                className={cn(
                  "flex min-h-14 w-full items-center gap-3 rounded-(--r-card) px-4 py-3 text-left transition-colors",
                  "hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none",
                )}
              >
                <SuggestionRow suggestion={suggestion} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PopoverAddressSearch({
  listId,
  inputId,
  query,
  results,
  searching,
  strings,
  autoFocus,
  selectOnFocus,
  inputClassName,
  onType,
  onPick,
  pinned,
  onShortcut,
}: {
  listId: string;
  inputId: string;
  query: string;
  results: PlaceSuggestion[] | null;
  searching: boolean;
  strings: AddressSearchStrings;
  autoFocus?: boolean;
  selectOnFocus: boolean;
  inputClassName?: string;
  onType: (next: string) => void;
  onPick: (suggestion: PlaceSuggestion) => void;
  pinned: AddressShortcut[];
  onShortcut: (shortcut: AddressShortcut) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [focused, setFocused] = useState(false);

  const found = results ?? [];
  const count = pinned.length + found.length;
  const open =
    !dismissed &&
    (searching || results !== null || (focused && pinned.length > 0));
  const current = Math.min(active, Math.max(count - 1, 0));
  const optionId = (index: number) => `${listId}-${index}`;

  const option = (index: number) => ({
    id: optionId(index),
    role: "option",
    "aria-selected": index === current,
    "data-active": index === current,
    onPointerMove: () => setActive(index),
    onPointerDown: (event: PointerEvent) => event.preventDefault(),
    onClick: () => choose(index),
    className:
      "flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-2sm data-[active=true]:bg-canvas-deep",
  });

  const type = (next: string) => {
    setDismissed(false);
    setActive(0);
    onType(next);
  };

  const choose = (index: number) => {
    setActive(0);
    if (index < pinned.length) onShortcut(pinned[index]);
    else onPick(found[index - pinned.length]);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!count) return;
      event.preventDefault();
      setDismissed(false);
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current + step + count) % count);
      return;
    }
    if (
      event.key === "Enter" &&
      !event.metaKey &&
      !event.ctrlKey &&
      open &&
      current < count
    ) {
      event.preventDefault();
      event.stopPropagation();
      choose(current);
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setDismissed(true);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!next) setDismissed(true);
      }}
    >
      <PopoverAnchor asChild>
        <div className="relative">
          <label
            htmlFor={inputId}
            className="sr-only"
          >
            {strings.label}
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <Input
            ref={input}
            id={inputId}
            role="combobox"
            aria-expanded={open && count > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              open && count ? optionId(current) : undefined
            }
            value={query}
            onChange={(event) => type(event.target.value)}
            onKeyDown={onKeyDown}
            onClick={() => setDismissed(false)}
            onFocus={(event) => {
              setFocused(true);
              if (selectOnFocus) event.target.select();
            }}
            onBlur={() => setFocused(false)}
            placeholder={strings.placeholder}
            autoComplete="off"
            autoFocus={autoFocus}
            className={cn(
              "h-9 rounded-lg border-line pr-8 pl-8 text-2sm md:text-2sm",
              inputClassName,
            )}
          />
          {searching && (
            <Loader2
              className="absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 animate-spin text-ink-faint motion-reduce:animate-none"
              aria-label={strings.searching}
            />
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          if (event.target === input.current) event.preventDefault();
        }}
        className="w-(--radix-popover-trigger-width) min-w-64 rounded-xl border-line p-1"
      >
        {count ? (
          <ul
            id={listId}
            role="listbox"
            aria-label={strings.label}
            className="flex max-h-72 flex-col overflow-y-auto"
          >
            {pinned.map((shortcut, index) => (
              <li
                key={shortcut.id}
                {...option(index)}
              >
                <House
                  className="size-4 shrink-0 text-ink-faint"
                  aria-hidden
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium text-ink">
                    {shortcut.name}
                  </span>
                  <span className="truncate text-xs text-ink-soft">
                    {shortcut.hint}
                  </span>
                </span>
              </li>
            ))}
            {found.map((suggestion, at) => (
              <li
                key={suggestion.id}
                {...option(pinned.length + at)}
              >
                <SuggestionRow
                  suggestion={suggestion}
                  compact
                />
              </li>
            ))}
          </ul>
        ) : null}
        {found.length || (!searching && results === null) ? null : (
          <p
            id={count ? undefined : listId}
            aria-live="polite"
            className="px-2 py-1.5 text-2sm text-ink-soft"
          >
            {searching ? strings.searching : strings.noResults}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function SuggestionRow({
  suggestion,
  compact = false,
}: {
  suggestion: PlaceSuggestion;
  compact?: boolean;
}) {
  const Icon = suggestion.kind === "poi" ? Store : MapPin;
  return (
    <>
      <Icon
        className={cn("shrink-0 text-ink-faint", compact ? "size-4" : "size-5")}
        aria-hidden
      />
      {compact ? (
        <span className="min-w-0 flex-1 truncate">
          <span className="font-medium text-ink">{suggestion.name}</span>
          {suggestion.context ? (
            <span className="text-ink-soft">
              {" · "}
              {suggestion.context}
            </span>
          ) : null}
        </span>
      ) : (
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-ink">
            {suggestion.name}
          </span>
          <span className="block truncate text-sm text-ink-soft">
            {suggestion.context}
          </span>
        </span>
      )}
    </>
  );
}
