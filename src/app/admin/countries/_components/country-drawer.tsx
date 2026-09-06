"use client";

import { useId, useRef, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
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
import { REGION_CODES, regionName } from "@/lib/countries";
import { fill } from "@/lib/utils";
import { AdminDrawer, submitOnCmdEnter } from "../../_components/admin-drawer";
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
  nameHint: string;
  pick: { label: string; placeholder: string; empty: string };
  fields: { name: string; code: string };
  errors: NotifyLabels["errors"];
};

export function CountryDrawer({
  open,
  country,
  language,
  labels,
  onClose,
  onDone,
}: {
  open: boolean;
  country: CountryRow | null;
  language: string;
  labels: CountryFormLabels;
  onClose: () => void;
  onDone: () => void;
}) {
  const formId = useId();
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<CountryInput>({
    resolver: zodResolver(countryInput),
    defaultValues: { name: country?.name ?? "", code: country?.code ?? "" },
  });
  const autoFilled = useRef<string | null>(null);

  const pick = (code: string | null) => {
    if (!code) return;
    form.setValue("code", code, { shouldValidate: true });
    const current = form.getValues("name").trim();
    if (current !== "" && current !== autoFilled.current) return;
    autoFilled.current = regionName(code, language);
    form.setValue("name", autoFilled.current, { shouldValidate: true });
  };

  const matches = (code: string, query: string) => {
    const term = query.trim().toLowerCase();
    if (term === "") return true;
    return (
      code.toLowerCase().startsWith(term) ||
      regionName(code, language).toLowerCase().includes(term)
    );
  };

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
    <AdminDrawer
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={country ? labels.edit : labels.new}
      footer={
        <>
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
            form={formId}
            disabled={pending}
            className="min-h-11 bg-red text-white hover:bg-red-hover"
          >
            {labels.save}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <form
          id={formId}
          ref={(node) =>
            setPortal(node?.closest<HTMLElement>("[data-vaul-drawer]") ?? null)
          }
          onSubmit={submit}
          onKeyDown={submitOnCmdEnter}
          aria-busy={pending}
          className="grid gap-5"
        >
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{labels.pick.label}</FormLabel>
                <Combobox
                  items={REGION_CODES}
                  value={field.value || null}
                  onValueChange={pick}
                  itemToStringLabel={(code: string) =>
                    regionName(code, language)
                  }
                  filter={matches}
                >
                  <FormControl>
                    <ComboboxInput
                      autoFocus
                      autoComplete="off"
                      placeholder={labels.pick.placeholder}
                      className="h-11 border-line text-base"
                    />
                  </FormControl>
                  <ComboboxContent container={portal}>
                    <ComboboxEmpty>{labels.pick.empty}</ComboboxEmpty>
                    <ComboboxList>
                      <ComboboxCollection>
                        {(code: string) => (
                          <ComboboxItem
                            key={code}
                            value={code}
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {regionName(code, language)}
                            </span>
                            <span className="font-mono text-xs text-ink-soft">
                              {code}
                            </span>
                          </ComboboxItem>
                        )}
                      </ComboboxCollection>
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
                <FormMessage />
              </FormItem>
            )}
          />

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
                <p className="text-2sm text-ink-soft">{labels.nameHint}</p>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </AdminDrawer>
  );
}
