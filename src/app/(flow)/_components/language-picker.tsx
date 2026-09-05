"use client";

import { useTransition } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Locale } from "@/lib/i18n";
import { setLocale } from "../actions";

const LANGUAGES = [
  { locale: "en", name: "English" },
  { locale: "da", name: "Dansk" },
  { locale: "de", name: "Deutsch" },
] as const;

export function LanguagePicker({
  locale,
  label,
}: {
  locale: Locale;
  label: string;
}) {
  const [pending, startTransition] = useTransition();
  const active = LANGUAGES.find((l) => l.locale === locale) ?? LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          aria-label={`${label} — ${active.name}`}
          disabled={pending}
          className="group h-11 gap-2 rounded-full border-line bg-canvas px-4 shadow-none hover:bg-grey-tint"
        >
          <Languages
            aria-hidden
            className="size-4"
          />
          <span className="font-display text-sm">
            {active.locale.toUpperCase()}
          </span>
          <ChevronDown
            aria-hidden
            className="size-4 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-52 rounded-2xl border-line p-2 shadow-none"
      >
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(next) =>
            startTransition(() => {
              document.documentElement.lang = next;
              return setLocale(next);
            })
          }
        >
          {LANGUAGES.map((language) => (
            <DropdownMenuRadioItem
              key={language.locale}
              value={language.locale}
              className="gap-3 rounded-xl py-3 pr-3 pl-3 text-base [&>span:first-child]:hidden"
            >
              {language.name}
              {language.locale === locale && (
                <Check
                  aria-hidden
                  className="ml-auto size-4"
                />
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
