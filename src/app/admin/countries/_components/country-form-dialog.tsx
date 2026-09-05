"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { countryInput, type CountryInput } from "@/features/chapters/schemas";
import { fill } from "@/lib/utils";
import { notify, type NotifyLabels } from "../../_components/action-feedback";
import { createCountryAction, updateCountryAction } from "../actions";
import type { CountryRow } from "./countries-table";

export type CountryFormLabels = {
  new: string;
  edit: string;
  save: string;
  cancel: string;
  created: string;
  saved: string;
  fields: { name: string; code: string };
  errors: NotifyLabels["errors"];
};

export function CountryFormDialog({
  open,
  country,
  labels,
  onClose,
  onDone,
}: {
  open: boolean;
  country: CountryRow | null;
  labels: CountryFormLabels;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const form = useForm<CountryInput>({
    resolver: zodResolver(countryInput),
    defaultValues: {
      name: country?.name ?? "",
      code: country?.code ?? "",
    },
  });

  const submit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = country
        ? await updateCountryAction(country.id, values)
        : await createCountryAction(values);
      notify(result, {
        done: country
          ? labels.saved
          : fill(labels.created, { name: values.name }),
        errors: labels.errors,
      });
      if (result.ok) onDone();
    });
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent>
        <Form {...form}>
          <form
            onSubmit={submit}
            aria-busy={pending}
            className="grid gap-5"
          >
            <DialogHeader>
              <DialogTitle>{country ? labels.edit : labels.new}</DialogTitle>
            </DialogHeader>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{labels.fields.name}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoComplete="off"
                      className="h-11 border-line text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{labels.fields.code}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      maxLength={2}
                      autoComplete="off"
                      autoCapitalize="characters"
                      className="h-11 w-24 border-line font-mono text-base uppercase"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={onClose}
              >
                {labels.cancel}
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className="min-h-11"
              >
                {labels.save}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
