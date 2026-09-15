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

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  className,
  ...input
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  hint?: string;
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
          {hint ? <p className="text-2sm text-ink-soft">{hint}</p> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
