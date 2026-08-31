"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { CountryCode } from "libphonenumber-js";
import { COUNTRIES, dialCodeOf } from "@/lib/identity";
import { haptics } from "@/lib/native/haptics";
import { cn, fill } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Step } from "../../_components/step";
import { useFlow } from "../../_components/flow-state";

type Strings = {
  title: string;
  searchLabel: string;
  searchPlaceholder: string;
  noResults: string;
  selected: string;
};

export function CountryStep({
  strings,
  common,
  locale,
  defaultCountry,
}: {
  strings: Strings;
  common: { continue: string };
  locale: string;
  defaultCountry: CountryCode;
}) {
  const router = useRouter();
  const { flow, update } = useFlow();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<CountryCode>(
    (flow.country as CountryCode | null) ?? defaultCountry,
  );
  const list = useRef<HTMLUListElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);

  const countries = useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: "region" });
    return COUNTRIES.map((code) => ({
      code,
      name: names.of(code) ?? code,
      dial: dialCodeOf(code),
    })).sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [locale]);

  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    if (!needle) return countries;
    return countries.filter(
      (country) =>
        country.name.toLocaleLowerCase(locale).includes(needle) ||
        country.dial.includes(needle),
    );
  }, [countries, query, locale]);

  const onScroll = () => {
    const node = list.current;
    if (!node) return;
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const middle = node.scrollTop + node.clientHeight / 2;
      const rows = Array.from(node.children) as HTMLElement[];
      const nearest = rows.reduce((best, row) =>
        Math.abs(row.offsetTop + row.offsetHeight / 2 - middle) <
        Math.abs(best.offsetTop + best.offsetHeight / 2 - middle)
          ? row
          : best,
      );
      const code = nearest?.dataset.code as CountryCode | undefined;
      if (code && code !== active) {
        haptics.selectionChanged();
        setActive(code);
      }
    }, 80);
  };

  useEffect(() => () => clearTimeout(settle.current), []);

  useEffect(() => {
    const row = list.current?.querySelector<HTMLElement>(
      `[data-code="${active}"]`,
    );
    row?.scrollIntoView({ block: "center" });
  }, []);

  const choose = (code: CountryCode) => {
    update({ country: code });
    haptics.selectionEnd();
    router.back();
  };

  return (
    <Step
      title={strings.title}
      action={
        <Button
          size="lg"
          onClick={() => choose(active)}
          className="h-14 w-full rounded-full bg-red text-base text-white hover:bg-red-hover"
        >
          {common.continue}
        </Button>
      }
    >
      <div className="relative mb-4">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ink-faint"
          aria-hidden
        />
        <label
          htmlFor="country-search"
          className="sr-only"
        >
          {strings.searchLabel}
        </label>
        <Input
          id="country-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={strings.searchPlaceholder}
          autoComplete="off"
          className="h-12 rounded-full border-line pl-11 text-base"
        />
      </div>

      {matches.length === 0 ? (
        <p className="py-10 text-center text-ink-soft">{strings.noResults}</p>
      ) : (
        <ul
          ref={list}
          onScroll={onScroll}
          role="listbox"
          aria-label={strings.title}
          aria-activedescendant={`country-${active}`}
          tabIndex={0}
          className="h-60 snap-y snap-mandatory overflow-y-auto scroll-py-24 py-24 focus-visible:outline-none"
        >
          {matches.map((country) => {
            const isActive = country.code === active;
            return (
              <li
                key={country.code}
                id={`country-${country.code}`}
                data-code={country.code}
                role="option"
                aria-selected={isActive}
                className="snap-center"
              >
                <button
                  type="button"
                  onClick={() => choose(country.code)}
                  aria-label={fill(strings.selected, {
                    country: country.name,
                    dialCode: country.dial,
                  })}
                  className={cn(
                    "flex w-full items-baseline gap-3 px-1 py-2 text-left font-bold transition-all hover:text-ink motion-reduce:transition-none",
                    isActive ? "text-2xl text-ink" : "text-xl text-ink-faint",
                  )}
                >
                  <span className="truncate">{country.name}</span>
                  <span className="ml-auto shrink-0 tabular-nums">
                    {country.dial}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Step>
  );
}
