"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AppDrawer } from "@/components/app-drawer";
import {
  RiderCard,
  emptyRider,
  isRiderComplete,
  riderPayload,
  type AddressLookup,
  type RiderCardStrings,
  type RiderDraft,
} from "@/components/riders/rider-card";
import { Button } from "@/components/ui/button";
import { useDrawerParam } from "@/hooks/use-drawer-param";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { haptics } from "@/lib/native/haptics";
import { addManagedRider } from "../actions";

const PARAM = "add-rider";

export type AddRiderStrings = RiderCardStrings & {
  open: string;
  drawerBody: string;
  save: string;
  added: string;
  errors: Record<string, string>;
};

export function AddRiderDrawer({
  strings,
  lookup,
  locale,
}: {
  strings: AddRiderStrings;
  lookup: AddressLookup;
  locale: Locale;
}) {
  const searchParams = useSearchParams();
  const { go, withParam } = useDrawerParam();
  const open = searchParams.get(PARAM) === "1";
  const close = () => go((params) => params.delete(PARAM));

  return (
    <>
      <Link
        href={withParam(PARAM, "1")}
        replace
        scroll={false}
        className="flex min-h-13 items-center gap-3 rounded-2xl px-3 py-2 font-medium text-ink outline-none transition-colors hover:bg-canvas-deep focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-mint-tint">
          <Plus
            className="size-5"
            aria-hidden
          />
        </span>
        {strings.open}
      </Link>
      <AppDrawer
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
        }}
        title={strings.open}
        description={strings.drawerBody}
      >
        {open ? (
          <AddRiderForm
            strings={strings}
            lookup={lookup}
            locale={locale}
            onDone={close}
          />
        ) : null}
      </AppDrawer>
    </>
  );
}

function AddRiderForm({
  strings,
  lookup,
  locale,
  onDone,
}: {
  strings: AddRiderStrings;
  lookup: AddressLookup;
  locale: Locale;
  onDone: () => void;
}) {
  const [rider, setRider] = useState<RiderDraft>(emptyRider);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const complete = isRiderComplete(rider);

  const submit = () =>
    startTransition(async () => {
      const result = await addManagedRider(riderPayload(rider));
      if (!result.ok) {
        haptics.error();
        setError(strings.errors[result.error] ?? strings.errors.generic);
        return;
      }
      haptics.success();
      toast.success(
        formatMessage(
          strings.added,
          { name: `${rider.firstName} ${rider.lastName}`.trim() },
          locale,
        ),
      );
      onDone();
    });

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (complete && !pending) submit();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          if (complete && !pending) submit();
        }
      }}
    >
      <RiderCard
        rider={rider}
        title={`${rider.firstName} ${rider.lastName}`.trim() || strings.open}
        strings={strings}
        lookup={lookup}
        onChange={(patch) => {
          setError(null);
          setRider((current) => ({ ...current, ...patch }));
        }}
      />
      {error && (
        <p
          role="alert"
          className="text-center text-sm text-red-ink"
        >
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={!complete || pending}
        className="h-12 w-full rounded-full"
      >
        {strings.save}
      </Button>
    </form>
  );
}
