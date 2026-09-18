"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { searchPeopleAction, type PersonSuggestion } from "../actions";
import { ChatAvatar } from "./chat-avatar";

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

type SearchResult = { query: string; people: PersonSuggestion[] };

export function PeopleSearch({
  id,
  placeholder,
  strings,
  excludeUserIds = [],
  onPick,
  onError,
}: {
  id: string;
  placeholder: string;
  strings: { searching: string; noMatches: string };
  excludeUserIds?: string[];
  onPick: (person: PersonSuggestion) => void;
  onError: (error: "rateLimited" | "generic") => void;
}) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const request = useRef(0);

  const trimmed = query.trim();
  const active = trimmed.length >= MIN_CHARS;

  useEffect(() => {
    if (!active) return;
    const current = ++request.current;
    const timer = setTimeout(async () => {
      const response = await searchPeopleAction({ query: trimmed });
      if (current !== request.current) return;
      if (!response.ok) {
        setResult({ query: trimmed, people: [] });
        onError(response.error);
        return;
      }
      setResult({ query: trimmed, people: response.people });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [active, trimmed, onError]);

  const settled = active && result?.query === trimmed;
  const people = settled
    ? result.people.filter((person) => !excludeUserIds.includes(person.userId))
    : [];

  const pick = (person: PersonSuggestion) => {
    onPick(person);
    setQuery("");
    setResult(null);
  };

  return (
    <Command
      shouldFilter={false}
      className={cn(
        "rounded-lg border border-line bg-canvas",
        !active && "**:data-[slot=command-input-wrapper]:border-b-0",
      )}
    >
      <CommandInput
        id={id}
        value={query}
        onValueChange={setQuery}
        placeholder={placeholder}
        autoComplete="off"
      />
      {active ? (
        <CommandList>
          {!settled ? (
            <p className="flex items-center gap-2 px-3 py-3 text-2sm text-ink-soft">
              <Loader2
                aria-hidden
                className="size-3.5 animate-spin"
              />
              {strings.searching}
            </p>
          ) : people.length === 0 ? (
            <p className="px-3 py-3 text-2sm text-ink-soft">
              {strings.noMatches}
            </p>
          ) : (
            people.map((person) => (
              <CommandItem
                key={person.userId}
                value={person.userId}
                onSelect={() => pick(person)}
                className="gap-3 px-3 py-2"
              >
                <ChatAvatar
                  svg={person.avatarSvg}
                  size="sm"
                />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {person.name}
                </span>
                {person.subtitle ? (
                  <span className="max-w-32 truncate text-2sm text-ink-soft">
                    {person.subtitle}
                  </span>
                ) : null}
              </CommandItem>
            ))
          )}
        </CommandList>
      ) : null}
    </Command>
  );
}
