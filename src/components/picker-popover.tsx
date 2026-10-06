"use client";

import { useState, type ReactNode } from "react";
import {
  Command,
  CommandEmpty,
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
import { cn } from "@/lib/utils";

export function PickerPopover<T extends { id: string }>({
  items,
  keywords,
  renderItem,
  onSelect,
  isDisabled,
  search,
  empty,
  align = "end",
  closeOnSelect = true,
  footer,
  className,
  children,
}: {
  items: T[];
  keywords: (item: T) => string[];
  renderItem: (item: T) => ReactNode;
  onSelect: (item: T) => void;
  isDisabled?: (item: T) => boolean;
  search: string;
  empty: string;
  align?: "start" | "center" | "end";
  closeOnSelect?: boolean;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align={align}
        className={cn("w-64 rounded-xl border-line p-0", className)}
      >
        <Command className="rounded-xl bg-transparent">
          <CommandInput
            placeholder={search}
            className="h-9 text-2sm md:text-2sm"
          />
          <CommandList className="max-h-72">
            <CommandEmpty className="py-4 text-center text-2sm text-ink-soft">
              {empty}
            </CommandEmpty>
            <CommandGroup className="p-1">
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  keywords={keywords(item)}
                  disabled={isDisabled?.(item)}
                  onSelect={() => {
                    if (closeOnSelect) setOpen(false);
                    onSelect(item);
                  }}
                  className="min-h-9 gap-2 rounded-lg px-2 text-2sm data-[disabled=true]:opacity-50 data-[selected=true]:bg-canvas-deep"
                >
                  {renderItem(item)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {footer}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
