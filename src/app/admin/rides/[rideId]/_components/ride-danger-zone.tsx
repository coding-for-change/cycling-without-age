"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent } from "react";
import { Ban } from "lucide-react";
import { notify } from "@/components/action-feedback";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { cancelRideAction, deleteRideAction } from "@/features/rides/actions";
import {
  RIDE_CANCELLATION_REASONS,
  RIDE_NOTE_MAX,
  type RideCancellationReasonName,
  type RideStatusName,
} from "@/features/rides/schemas";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";
import { PROPERTY_BUTTON } from "../../../_components/properties";

type Strings = Dictionary["rides"];

export type DangerZoneLabels = {
  cancel: Strings["cancel"];
  delete: Strings["delete"];
  reasons: Strings["reasons"];
  errors: { generic: string } & Record<string, string>;
};

export function RideDangerZone({
  rideId,
  status,
  deleteName,
  consequences,
  deleteBlocked,
  returnLeg,
  backHref,
  language,
  labels,
}: {
  rideId: string;
  status: RideStatusName;
  deleteName: string;
  consequences: string[];
  deleteBlocked: string | null;
  returnLeg: string | null;
  backHref: string;
  language: Locale;
  labels: DangerZoneLabels;
}) {
  const router = useRouter();

  if (status === "scheduled")
    return (
      <CancelRideDialog
        rideId={rideId}
        returnLeg={returnLeg}
        language={language}
        labels={labels}
      />
    );
  if (status !== "cancelled") return null;
  if (deleteBlocked)
    return <p className="text-2sm text-ink-soft">{deleteBlocked}</p>;

  return (
    <ConfirmDeleteDialog
      name={deleteName}
      consequences={consequences}
      locale={language}
      labels={{ ...labels.delete, errors: labels.errors }}
      cancel={labels.delete.cancel}
      action={() => deleteRideAction(rideId)}
      onDone={() => router.push(backHref)}
    />
  );
}

function CancelRideDialog({
  rideId,
  returnLeg,
  language,
  labels,
}: {
  rideId: string;
  returnLeg: string | null;
  language: Locale;
  labels: DangerZoneLabels;
}) {
  const ids = { reason: useId(), note: useId(), back: useId() };
  const strings = labels.cancel;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<RideCancellationReasonName>(
    RIDE_CANCELLATION_REASONS[0],
  );
  const [note, setNote] = useState("");
  const [includeReturnLeg, setIncludeReturnLeg] = useState(true);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setReason(RIDE_CANCELLATION_REASONS[0]);
    setNote("");
    setIncludeReturnLeg(true);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    startTransition(async () => {
      const result = await cancelRideAction(rideId, {
        reasonCode: reason,
        note: note.trim() || null,
        includeReturnLeg: returnLeg !== null && includeReturnLeg,
      });
      notify(result, {
        done: !result.ok
          ? strings.done
          : result.cancelledIds.length === 0
            ? strings.unchanged
            : result.cancelledIds.length > 1
              ? strings.doneBoth
              : strings.done,
        errors: labels.errors,
      });
      if (!result.ok) return;
      setOpen(false);
      reset();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            PROPERTY_BUTTON,
            "text-red hover:bg-red-tint hover:text-red",
          )}
        >
          <Ban aria-hidden />
          {strings.open}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={submit}
          aria-busy={pending}
          className="grid gap-4"
        >
          <DialogHeader>
            <DialogTitle>{strings.title}</DialogTitle>
            <DialogDescription className="text-ink-soft">
              {strings.body}
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor={ids.reason}>{strings.reason}</FieldLabel>
            <NativeSelect
              id={ids.reason}
              value={reason}
              onChange={(event) =>
                setReason(event.target.value as RideCancellationReasonName)
              }
              className="h-11 border-line text-base"
            >
              {RIDE_CANCELLATION_REASONS.map((code) => (
                <NativeSelectOption
                  key={code}
                  value={code}
                >
                  {labels.reasons[code]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor={ids.note}>{strings.note}</FieldLabel>
            <Textarea
              id={ids.note}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={strings.notePlaceholder}
              maxLength={RIDE_NOTE_MAX}
              rows={3}
              className="border-line text-base"
            />
          </Field>
          {returnLeg ? (
            <Field orientation="horizontal">
              <Checkbox
                id={ids.back}
                checked={includeReturnLeg}
                onCheckedChange={(next) => setIncludeReturnLeg(next === true)}
                className="size-5 border-line data-[state=checked]:border-mint-deep data-[state=checked]:bg-mint-deep"
              />
              <FieldContent>
                <FieldLabel htmlFor={ids.back}>{strings.returnLeg}</FieldLabel>
                <FieldDescription>
                  {formatMessage(
                    strings.returnLegHint,
                    { when: returnLeg },
                    language,
                  )}
                </FieldDescription>
              </FieldContent>
            </Field>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                className="min-h-11 border-line"
              >
                {strings.keep}
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={pending}
              variant="brand"
              className="min-h-11"
            >
              {strings.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
