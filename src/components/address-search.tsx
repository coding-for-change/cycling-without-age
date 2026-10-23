"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  House,
  Loader2,
  MapPin,
  Search,
  Store,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { useKeyboardInset } from "@/lib/native/keyboard";
import { cn } from "@/lib/utils";
import type { PlaceSuggestion } from "@/lib/mapbox";

const DEBOUNCE_MS = 250;
const MIN_CHARS = 3;
const EDGE_GAP = 8;

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
  icon?: LucideIcon;
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
  const hintId = useId();
  const input = useRef<HTMLInputElement>(null);
  const keyboardInset = useKeyboardInset();
  const [query, setQuery] = useState(defaultQuery);
  const [typed, setTyped] = useState(false);
  const [results, setResults] = useState<PlaceSuggestion[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [focused, setFocused] = useState(false);
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

  const compact = variant === "popover";
  const term = typed ? query.trim().toLocaleLowerCase() : "";
  const pinned = term
    ? shortcuts.filter((shortcut) =>
        `${shortcut.name} ${shortcut.keywords ?? ""}`
          .toLocaleLowerCase()
          .includes(term),
      )
    : shortcuts;
  const found = results ?? [];
  const count = pinned.length + found.length;
  const open =
    !dismissed &&
    (searching || results !== null || (focused && pinned.length > 0));
  const current = Math.min(active, Math.max(count - 1, 0));
  const optionId = (index: number) => `${listId}-${index}`;

  const reset = () => {
    latest.current++;
    setQuery("");
    setTyped(false);
    setResults(null);
    setSearching(false);
    setActive(0);
  };

  const onType = (next: string) => {
    setDismissed(false);
    setActive(0);
    setTyped(true);
    setQuery(next);
    const short = next.trim().length < MIN_CHARS;
    if (short) setResults(null);
    setSearching(!short);
  };

  const choose = (index: number) => {
    if (index < pinned.length) {
      const shortcut = pinned[index];
      reset();
      shortcut.onPick();
      return;
    }
    const suggestion = found[index - pinned.length];
    reset();
    onPick(suggestion);
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

  const option = (index: number) => ({
    id: optionId(index),
    role: "option",
    "aria-selected": index === current,
    "data-active": index === current,
    onPointerMove: () => setActive(index),
    onPointerDown: (event: PointerEvent) => event.preventDefault(),
    onClick: () => choose(index),
    className: cn(
      "flex cursor-pointer items-center rounded-lg data-[active=true]:bg-canvas-deep",
      compact
        ? "min-h-9 gap-2 px-2 py-1.5 text-2sm"
        : "min-h-12 gap-3 px-3 py-2 text-base",
    ),
  });

  const status = searching
    ? strings.searching
    : results !== null && !found.length
      ? strings.noResults
      : null;

  return (
    <div>
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
              className={cn(
                "pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-faint",
                compact ? "left-2.5 size-4" : "left-3 size-5",
              )}
              aria-hidden
            />
            <Input
              ref={input}
              id={inputId}
              role="combobox"
              aria-expanded={open && count > 0}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-describedby={compact ? undefined : hintId}
              aria-activedescendant={
                open && count ? optionId(current) : undefined
              }
              value={query}
              onChange={(event) => onType(event.target.value)}
              onKeyDown={onKeyDown}
              onClick={() => setDismissed(false)}
              onFocus={(event) => {
                setFocused(true);
                if (defaultQuery) event.target.select();
              }}
              onBlur={() => setFocused(false)}
              placeholder={strings.placeholder}
              autoComplete="off"
              autoFocus={autoFocus}
              enterKeyHint="search"
              className={cn(
                compact
                  ? "h-9 rounded-lg border-line pr-8 pl-8 text-2sm md:text-2sm"
                  : "h-12 rounded-full border-line pr-11 pl-11 text-base",
                inputClassName,
              )}
            />
            {searching && (
              <Loader2
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 animate-spin text-ink-faint motion-reduce:animate-none",
                  compact ? "right-2.5 size-3.5" : "right-4 size-4",
                )}
                aria-label={strings.searching}
              />
            )}
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          sideOffset={4}
          collisionPadding={{
            top: EDGE_GAP,
            bottom: keyboardInset + EDGE_GAP,
            left: EDGE_GAP,
            right: EDGE_GAP,
          }}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            if (event.target === input.current) event.preventDefault();
          }}
          className={cn(
            "flex max-h-(--radix-popover-content-available-height) w-(--radix-popover-trigger-width) flex-col overflow-hidden rounded-xl border-line p-1",
            compact ? "min-w-64" : "shadow-lift",
          )}
        >
          {count ? (
            <ul
              id={listId}
              role="listbox"
              aria-label={strings.label}
              className={cn(
                "flex min-h-0 flex-col overflow-y-auto overscroll-contain",
                compact ? "max-h-72" : "max-h-80",
              )}
            >
              {pinned.map(({ icon: Icon = House, ...shortcut }, index) => (
                <li
                  key={shortcut.id}
                  {...option(index)}
                >
                  <Icon
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
                    compact={compact}
                  />
                </li>
              ))}
            </ul>
          ) : null}
          {status && !found.length ? (
            <p
              id={count ? undefined : listId}
              aria-live="polite"
              className={cn(
                "text-ink-soft",
                compact ? "px-2 py-1.5 text-2sm" : "px-3 py-3 text-sm",
              )}
            >
              {status}
            </p>
          ) : null}
        </PopoverContent>
      </Popover>
      {compact ? null : (
        <p
          id={hintId}
          className="mt-2 px-1 text-sm text-ink-soft"
        >
          {strings.hint}
        </p>
      )}
    </div>
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
