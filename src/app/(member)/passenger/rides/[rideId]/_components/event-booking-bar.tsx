"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { notify } from "@/components/action-feedback";
import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { useKeyboardOpen } from "@/lib/native/keyboard";
import { cn } from "@/lib/utils";
import { bookEventSeatsAction, cancelRideAction } from "../../actions";
import { BookSeats, type BookSeatsLabels } from "./book-seats";

export type EventBarLabels = {
  spotsLeft: string;
  open: string;
  book: string;
  going: string;
  add: string;
  pickTitle: string;
  cancel: {
    label: string;
    aria: string;
    title: string;
    body: string;
    confirm: string;
    cancel: string;
    done: string;
  };
};

type Rider = { id: string; name: string };

export function EventBookingBar({
  rideId,
  seatsLeft,
  bookable,
  going,
  language,
  labels,
  seatLabels,
}: {
  rideId: string;
  seatsLeft: number | null;
  bookable: Rider[];
  going: boolean;
  language: Locale;
  labels: EventBarLabels;
  seatLabels: BookSeatsLabels;
}) {
  const keyboardOpen = useKeyboardOpen();
  const [picking, setPicking] = useState(false);
  const [pending, startTransition] = useTransition();
  const full = seatsLeft === 0;
  const canBook = bookable.length > 0 && !full;

  if (!going && !canBook && !full) return null;

  const bookOne = (rider: Rider) =>
    startTransition(async () => {
      const result = await bookEventSeatsAction({
        rideId,
        passengerIds: [rider.id],
      });
      notify(result, {
        done: formatMessage(seatLabels.done, { count: 1 }, language),
        errors: seatLabels.errors,
      });
    });

  const book = () =>
    bookable.length === 1 ? bookOne(bookable[0]) : setPicking(true);

  return (
    <>
      <div
        aria-hidden
        className="h-16 md:hidden"
      />
      <div
        className={cn(
          "fixed inset-x-0 bottom-above-tabbar z-30 flex justify-center px-4 md:sticky md:bottom-4 md:px-0",
          keyboardOpen && "hidden",
        )}
      >
        <div className="flex w-full max-w-md min-w-0 items-center gap-3 rounded-full bg-paper py-2 pr-2 pl-5 shadow-lift md:max-w-none">
          <p
            role="status"
            className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold"
          >
            {going ? (
              <>
                <span
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-mint-deep text-white"
                >
                  <Check className="size-4" />
                </span>
                <span className="truncate">{labels.going}</span>
              </>
            ) : (
              <span className="truncate">
                {seatsLeft === null
                  ? labels.open
                  : formatMessage(
                      labels.spotsLeft,
                      { count: seatsLeft },
                      language,
                    )}
              </span>
            )}
          </p>

          {going && canBook ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={book}
              className="min-h-11 shrink-0 rounded-full border-line px-4"
            >
              {pending ? (
                <Loader2
                  aria-hidden
                  className="animate-spin motion-reduce:animate-none"
                />
              ) : (
                <Plus aria-hidden />
              )}
              {labels.add}
            </Button>
          ) : null}

          {going ? (
            <ConfirmButton
              {...labels.cancel}
              ariaLabel={labels.cancel.aria}
              destructive
              size="default"
              variant="ghost"
              className="min-h-11 shrink-0 rounded-full px-4"
              errors={seatLabels.errors}
              action={() => cancelRideAction({ rideId })}
            />
          ) : canBook ? (
            <Button
              type="button"
              variant="brand"
              disabled={pending}
              aria-busy={pending}
              onClick={book}
              className="min-h-12 shrink-0 rounded-full px-5 text-base"
            >
              {pending ? (
                <Loader2
                  aria-hidden
                  className="animate-spin motion-reduce:animate-none"
                />
              ) : null}
              {labels.book}
            </Button>
          ) : null}
        </div>
      </div>

      {bookable.length > 1 ? (
        <Drawer
          open={picking}
          onOpenChange={setPicking}
        >
          <DrawerContent className="bg-canvas-deep">
            <DrawerHeader className="gap-1 px-4 pt-4 pb-3 text-left">
              <DrawerTitle className="font-display text-lg font-bold tracking-tight text-ink">
                {labels.pickTitle}
              </DrawerTitle>
              <DrawerDescription className="text-2sm text-ink-soft">
                {seatLabels.hint}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <BookSeats
                rideId={rideId}
                riders={bookable}
                seatsLeft={seatsLeft}
                language={language}
                labels={{ ...seatLabels, title: labels.pickTitle }}
                bare
                onBooked={() => setPicking(false)}
              />
            </div>
          </DrawerContent>
        </Drawer>
      ) : null}
    </>
  );
}
