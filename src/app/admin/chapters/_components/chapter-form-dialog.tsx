"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Control } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { chapterInput, type ChapterInput } from "@/features/chapters/schemas";
import { fill } from "@/lib/utils";
import { notify, type NotifyLabels } from "../../_components/action-feedback";
import { createChapterAction, updateChapterAction } from "../actions";
import type { ChapterRow } from "./chapters-table";

export type ChapterFormLabels = {
  new: string;
  edit: string;
  save: string;
  cancel: string;
  created: string;
  saved: string;
  fields: {
    name: string;
    slug: string;
    country: string;
    city: string;
    address: string;
    careHomeName: string;
    latitude: string;
    longitude: string;
    serviceRadiusKm: string;
  };
  errors: NotifyLabels["errors"];
};

type TextName = "name" | "slug" | "city" | "address" | "careHomeName";
type NumberName = "latitude" | "longitude" | "serviceRadiusKm";

function TextField({
  control,
  name,
  label,
}: {
  control: Control<ChapterInput>;
  name: TextName;
  label: string;
}) {
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
              autoComplete="off"
              className="h-11 border-line text-base"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function NumberField({
  control,
  name,
  label,
  step,
}: {
  control: Control<ChapterInput>;
  name: NumberName;
  label: string;
  step: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              disabled={field.disabled}
              type="number"
              step={step}
              inputMode="decimal"
              autoComplete="off"
              className="h-11 border-line text-base"
              value={field.value ?? ""}
              onChange={(event) =>
                field.onChange(
                  event.target.value === ""
                    ? undefined
                    : event.target.valueAsNumber,
                )
              }
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function ChapterFormDialog({
  open,
  chapter,
  countries,
  labels,
  onClose,
  onDone,
}: {
  open: boolean;
  chapter: ChapterRow | null;
  countries: { id: string; name: string }[];
  labels: ChapterFormLabels;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const form = useForm<ChapterInput>({
    resolver: zodResolver(chapterInput),
    defaultValues: chapter
      ? {
          name: chapter.name,
          slug: chapter.slug,
          countryId: chapter.countryId,
          city: chapter.city,
          address: chapter.address ?? "",
          careHomeName: chapter.careHomeName ?? "",
          latitude: chapter.latitude,
          longitude: chapter.longitude,
          serviceRadiusKm: chapter.serviceRadiusKm,
        }
      : {
          name: "",
          slug: "",
          countryId: countries[0]?.id ?? "",
          city: "",
          address: "",
          careHomeName: "",
        },
  });

  const fixedCountry = chapter
    ? chapter.countryName
    : countries.length === 1
      ? countries[0].name
      : null;

  const submit = form.handleSubmit((values) => {
    const payload = {
      ...values,
      address: values.address || undefined,
      careHomeName: values.careHomeName || undefined,
    };
    startTransition(async () => {
      const result = chapter
        ? await updateChapterAction(chapter.id, payload)
        : await createChapterAction(payload);
      notify(result, {
        done: chapter
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
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <Form {...form}>
          <form
            onSubmit={submit}
            aria-busy={pending}
            className="grid gap-5"
          >
            <DialogHeader>
              <DialogTitle>{chapter ? labels.edit : labels.new}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                control={form.control}
                name="name"
                label={labels.fields.name}
              />
              {fixedCountry ? (
                <div className="grid gap-2">
                  <span className="text-sm font-medium">
                    {labels.fields.country}
                  </span>
                  <p className="flex h-11 items-center text-base text-ink-soft">
                    {fixedCountry}
                  </p>
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="countryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{labels.fields.country}</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 w-full border-line text-base">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem
                              key={country.id}
                              value={country.id}
                            >
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <TextField
                control={form.control}
                name="city"
                label={labels.fields.city}
              />
              <TextField
                control={form.control}
                name="careHomeName"
                label={labels.fields.careHomeName}
              />
              <div className="sm:col-span-2">
                <TextField
                  control={form.control}
                  name="address"
                  label={labels.fields.address}
                />
              </div>
              <NumberField
                control={form.control}
                name="latitude"
                label={labels.fields.latitude}
                step="any"
              />
              <NumberField
                control={form.control}
                name="longitude"
                label={labels.fields.longitude}
                step="any"
              />
              <NumberField
                control={form.control}
                name="serviceRadiusKm"
                label={labels.fields.serviceRadiusKm}
                step="1"
              />
              <TextField
                control={form.control}
                name="slug"
                label={labels.fields.slug}
              />
            </div>

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
