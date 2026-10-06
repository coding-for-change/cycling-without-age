"use client";

import {
  Check,
  ChevronDown,
  Monitor,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsRowButton } from "@/components/settings-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { isTheme, themes, type Theme } from "@/lib/theme";
import { setTheme, useResolvedTheme, useTheme } from "@/lib/theme/client";
import type { Dictionary } from "@/lib/i18n";

export type ThemeStrings = Dictionary["common"]["theme"];

const THEME_ICON: Record<Theme, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

export function ThemePicker({
  strings,
  label = strings.label,
  variant = "pill",
  className,
}: {
  strings: ThemeStrings;
  label?: string;
  variant?: "pill" | "row";
  className?: string;
}) {
  const theme = useTheme();
  const resolved = useResolvedTheme();
  const ActiveIcon = THEME_ICON[theme === "system" ? resolved : theme];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "row" ? (
          <SettingsRowButton
            icon={ActiveIcon}
            label={label}
            value={strings[theme]}
            chevron
            className={className}
          />
        ) : (
          <Button
            variant="outline"
            aria-label={`${label} — ${strings[theme]}`}
            className={cn(
              "group h-11 gap-2 rounded-full border-line bg-canvas px-4 shadow-none hover:bg-grey-tint",
              className,
            )}
          >
            <ActiveIcon
              aria-hidden
              className="size-4"
            />
            <ChevronDown
              aria-hidden
              className="size-4 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
            />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-52 rounded-2xl border-line p-2 shadow-none"
      >
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(next) => isTheme(next) && setTheme(next)}
        >
          {themes.map((option) => {
            const Icon = THEME_ICON[option];
            return (
              <DropdownMenuRadioItem
                key={option}
                value={option}
                className="gap-3 rounded-xl py-3 pr-3 pl-3 text-base [&>span:first-child]:hidden"
              >
                <Icon
                  aria-hidden
                  className="size-4 text-ink-soft"
                />
                {strings[option]}
                {option === theme && (
                  <Check
                    aria-hidden
                    className="ml-auto size-4"
                  />
                )}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
