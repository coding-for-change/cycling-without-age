"use client";

import {
  useDeferredValue,
  useId,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { Accessibility, Search, TriangleAlert } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { notify } from "@/components/action-feedback";
import { AppDrawer, submitOnCmdEnter } from "@/components/app-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { FileThumb } from "@/features/fleet/components/file-image";
import { useDrawerParam } from "@/hooks/use-drawer-param";
import { cn, fill } from "@/lib/utils";
import { allocateTrishawsAction } from "../actions";
import { ALLOCATION_PARAM } from "./allocation-param";

export type AllocationOption = {
  id: string;
  name: string;
  photoFileId: string | null;
  model: string | null;
  seats: string | null;
  wheelchair: boolean;
  location: string;
  isPool: boolean;
  allocated: boolean;
  blocked: string | null;
  warning: string | null;
  damaged: boolean;
};

export type AllocationLabels = {
  title: string;
  search: string;
  noMatch: string;
  none: string;
  selected: { one: string; other: string };
  nothingSelected: string;
  submit: string;
  saving: string;
  saved: string;
  loadFailed: string;
  pool: string;
  wheelchair: string;
  damaged: string;
  errors: { generic: string } & Record<string, string>;
};

export function AllocateTrishawsDrawer({
  rideId,
  description,
  options,
  labels,
}: {
  rideId: string;
  description: string | null;
  options: AllocationOption[] | null;
  labels: AllocationLabels;
}) {
  const { go } = useDrawerParam();
  const searchParams = useSearchParams();
  const open = searchParams.get(ALLOCATION_PARAM) === rideId;
  const formId = useId();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [selected, setSelected] = useState(
    () =>
      new Set(
        (options ?? []).filter((option) => option.allocated).map((o) => o.id),
      ),
  );

  const close = () => go((params) => params.delete(ALLOCATION_PARAM));

  const toggle = (id: string, on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const needle = deferredQuery.trim().toLocaleLowerCase();
  const visible = (options ?? []).filter(
    (option) =>
      !needle ||
      [option.name, option.model ?? "", option.location].some((text) =>
        text.toLocaleLowerCase().includes(needle),
      ),
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || !options) return;
    const trishawIds = options
      .filter((option) => selected.has(option.id))
      .map((option) => option.id);
    startTransition(async () => {
      const result = await allocateTrishawsAction({ rideId, trishawIds });
      notify(result, { done: labels.saved, errors: labels.errors });
      if (result.ok) close();
    });
  };

  const count = selected.size;

  return (
    <AppDrawer
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title={labels.title}
      description={description ?? undefined}
      bodyClassName="px-0 py-0 md:px-0"
      footer={
        options ? (
          <>
            <p
              aria-live="polite"
              className="text-2sm text-ink-soft mr-auto"
            >
              {count === 0
                ? labels.nothingSelected
                : fill(
                    count === 1 ? labels.selected.one : labels.selected.other,
                    { count },
                  )}
            </p>
            <Button
              type="submit"
              form={formId}
              disabled={pending}
              variant="brand"
              className="min-h-11"
            >
              {pending ? labels.saving : labels.submit}
            </Button>
          </>
        ) : null
      }
    >
      {!options ? (
        <p className="text-2sm text-ink-soft px-5 py-5 md:px-6">
          {labels.loadFailed}
        </p>
      ) : (
        <form
          id={formId}
          onSubmit={submit}
          onKeyDown={submitOnCmdEnter}
          aria-busy={pending}
          className="flex flex-col"
        >
          {options.length > 0 ? (
            <div className="bg-canvas border-line sticky top-0 z-10 border-b px-5 py-3 md:px-6">
              <div className="relative">
                <Search
                  aria-hidden
                  className="text-ink-soft pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                />
                <Input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={labels.search}
                  aria-label={labels.search}
                  autoComplete="off"
                  className="border-line h-11 pl-9 text-base md:text-sm"
                />
              </div>
            </div>
          ) : null}

          {options.length === 0 ? (
            <p className="text-2sm text-ink-soft px-5 py-5 md:px-6">
              {labels.none}
            </p>
          ) : visible.length === 0 ? (
            <p className="text-2sm text-ink-soft px-5 py-5 md:px-6">
              {fill(labels.noMatch, { query: deferredQuery.trim() })}
            </p>
          ) : (
            <ul className="flex flex-col px-3 py-3 md:px-4">
              {visible.map((option) => (
                <OptionRow
                  key={option.id}
                  option={option}
                  checked={selected.has(option.id)}
                  onCheckedChange={(on) => toggle(option.id, on)}
                  labels={labels}
                />
              ))}
            </ul>
          )}
        </form>
      )}
    </AppDrawer>
  );
}

function OptionRow({
  option,
  checked,
  onCheckedChange,
  labels,
}: {
  option: AllocationOption;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  labels: AllocationLabels;
}) {
  const id = useId();
  const disabled = option.blocked !== null && !checked;
  const note = checked ? option.warning : (option.blocked ?? option.warning);

  return (
    <li>
      <label
        htmlFor={id}
        className={cn(
          "flex min-h-16 items-center gap-3 rounded-lg px-2 py-2 transition-colors motion-reduce:transition-none",
          disabled
            ? "cursor-not-allowed opacity-60"
            : "hover:bg-canvas-deep cursor-pointer",
          checked && "bg-mint-tint hover:bg-mint-tint",
        )}
      >
        <Checkbox
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(next) => onCheckedChange(next === true)}
          className="border-line data-[state=checked]:border-mint-deep data-[state=checked]:bg-mint-deep size-5"
        />
        <FileThumb
          fileId={option.photoFileId}
          alt=""
          size="md"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-medium">{option.name}</span>
            {option.isPool ? (
              <Badge
                variant="outline"
                className="border-line text-ink-soft"
              >
                {labels.pool}
              </Badge>
            ) : null}
            {option.damaged ? (
              <Badge
                variant="outline"
                className="border-line text-ink-soft"
              >
                {labels.damaged}
              </Badge>
            ) : null}
          </span>
          <span className="text-2sm text-ink-soft flex flex-wrap items-center gap-x-1.25">
            {[option.model, option.seats, option.location]
              .filter(Boolean)
              .join(" · ")}
            {option.wheelchair ? (
              <span className="inline-flex items-center gap-1">
                <span aria-hidden>·</span>
                <Accessibility
                  aria-hidden
                  className="size-3.5"
                />
                <span className="sr-only">{labels.wheelchair}</span>
              </span>
            ) : null}
          </span>
          {note ? (
            <span className="text-2sm text-ink flex items-center gap-1.25">
              <TriangleAlert
                aria-hidden
                className={cn(
                  "size-3.5 shrink-0",
                  checked && option.warning ? "text-red" : "text-ink-soft",
                )}
              />
              {note}
            </span>
          ) : null}
        </span>
      </label>
    </li>
  );
}
