"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { suggestAddresses } from "../actions";
import type { PlaceSuggestion } from "@/lib/mapbox";

const DEBOUNCE_MS = 250;
const MIN_CHARS = 3;

type Strings = {
  label: string;
  placeholder: string;
  hint: string;
  searching: string;
  noResults: string;
};

export function AddressSearch({
  sessionToken,
  language,
  strings,
  onPick,
}: {
  sessionToken: string;
  language: string;
  strings: Strings;
  onPick: (suggestion: PlaceSuggestion) => void;
}) {
  const listId = useId();
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSuggestion[] | null>(null);
  const [searching, setSearching] = useState(false);
  const latest = useRef(0);

  useEffect(() => {
    const term = query.trim();
    // Claimed before the short-query return, so clearing the box also retires
    // a request still in flight for the previous text.
    const ticket = ++latest.current;
    if (term.length < MIN_CHARS) return;

    const timer = setTimeout(async () => {
      const found = await suggestAddresses({
        query: term,
        sessionToken,
        language,
      });
      if (ticket !== latest.current) return;
      setResults(found);
      setSearching(false);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, sessionToken, language]);

  const onType = (next: string) => {
    setQuery(next);
    const short = next.trim().length < MIN_CHARS;
    if (short) setResults(null);
    setSearching(!short);
  };

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
          placeholder={strings.placeholder}
          autoComplete="off"
          className="h-12 rounded-full border-line pl-11 text-base"
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
                onClick={() => onPick(suggestion)}
                className={cn(
                  "flex min-h-14 w-full items-center gap-3 rounded-(--r-card) px-4 py-3 text-left transition-colors",
                  "hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none",
                )}
              >
                <MapPin
                  className="size-5 shrink-0 text-ink-faint"
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">
                    {suggestion.name}
                  </span>
                  <span className="block truncate text-sm text-ink-soft">
                    {suggestion.context}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
