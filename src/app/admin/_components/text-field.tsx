"use client";

import type { ComponentProps } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * The admin drawers' one text input: label, control, message. Anything passed
 * beyond `control`/`name`/`label` lands on the `Input`, so a date or an
 * autofocused first field stays a one-line difference rather than a copy.
 */
export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  className,
  ...input
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
} & Omit<ComponentProps<typeof Input>, "name" | "form">) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              value={field.value ?? ""}
              {...input}
              className={cn("h-11 border-line text-base", className)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
