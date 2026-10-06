"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { notify } from "@/components/action-feedback";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { submitOnCmdEnter } from "@/components/app-drawer";

type Strings = Dictionary["rides"];

export type RideTrashLabels = {
  cancel: Strings["cancel"];
  delete: Strings["delete"] & { consequences: string };
  reasons: Strings["reasons"];
  errors: { generic: string } & Record<string, string>;
};

const TRASH_BUTTON = "size-8 text-ink-soft hover:bg-red-tint hover:text-red";

export function RideTrash({
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
  labels: RideTrashLabels;
}) {
  if (status === "scheduled")
    return (
      <CancelRidePopover
        rideId={rideId}
        returnLeg={returnLeg}
        language={language}
        labels={labels}
      />
    );
  if (status !== "cancelled") return null;
  if (deleteBlocked)
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={labels.delete.submit}
            title={deleteBlocked}
            className={TRASH_BUTTON}
          >
            <Trash2 aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-72 rounded-xl border-line p-4 text-2sm text-ink-soft"
        >
          {deleteBlocked}
        </PopoverContent>
      </Popover>
    );

  return (
    <ConfirmDeleteDialog
      name={deleteName}
      consequences={consequences}
      locale={language}
      labels={{
        ...labels.delete,
        open: labels.delete.submit,
        errors: labels.errors,
      }}
      cancel={labels.delete.cancel}
      action={deleteRideAction}
      input={rideId}
      redirectTo={backHref}
      variant="icon"
    />
  );
}

function CancelRidePopover({
  rideId,
  returnLeg,
  language,
  labels,
}: {
  rideId: string;
  returnLeg: string | null;
  language: Locale;
  labels: RideTrashLabels;
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
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (!next) reset();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={strings.submit}
          title={strings.submit}
          className={TRASH_BUTTON}
        >
          <Trash2 aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 rounded-xl border-line p-0"
      >
        <form
          onSubmit={submit}
          onKeyDown={submitOnCmdEnter}
          aria-busy={pending}
          className="grid gap-3 p-4"
        >
          <div className="grid gap-1">
            <p className="text-2sm font-medium text-balance">{strings.title}</p>
            <p className="text-xs text-ink-soft">{strings.body}</p>
          </div>
          <div className="grid gap-1.25">
            <label
              htmlFor={ids.reason}
              className="text-xs font-medium text-ink-soft"
            >
              {strings.reason}
            </label>
            <NativeSelect
              id={ids.reason}
              value={reason}
              onChange={(event) =>
                setReason(event.target.value as RideCancellationReasonName)
              }
              className="h-9 w-full border-line text-2sm"
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
          </div>
          <div className="grid gap-1.25">
            <label
              htmlFor={ids.note}
              className="text-xs font-medium text-ink-soft"
            >
              {strings.note}
            </label>
            <Textarea
              id={ids.note}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={strings.notePlaceholder}
              maxLength={RIDE_NOTE_MAX}
              rows={2}
              className="min-h-16 border-line text-2sm md:text-2sm"
            />
          </div>
          {returnLeg ? (
            <div className="flex items-start gap-2">
              <Checkbox
                id={ids.back}
                checked={includeReturnLeg}
                onCheckedChange={(next) => setIncludeReturnLeg(next === true)}
                className="mt-0.5 border-line data-[state=checked]:border-mint-deep data-[state=checked]:bg-mint-deep"
              />
              <label
                htmlFor={ids.back}
                className="grid gap-0.5 text-2sm"
              >
                {strings.returnLeg}
                <span className="text-xs text-ink-soft">
                  {formatMessage(
                    strings.returnLegHint,
                    { when: returnLeg },
                    language,
                  )}
                </span>
              </label>
            </div>
          ) : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                reset();
              }}
              className="h-8 text-2sm"
            >
              {strings.keep}
            </Button>
            <Button
              type="submit"
              variant="brand"
              disabled={pending}
              className="h-8 text-2sm"
            >
              {strings.submit}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
