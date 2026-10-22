"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { ChevronRight, Copy, Map as MapIcon, MapPinned } from "lucide-react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import type { Locale } from "@/lib/format";
import { appleMapsUrl, googleMapsUrl } from "@/lib/geo";
import { formatMessage } from "@/lib/i18n/format";
import { haptics } from "@/lib/native/haptics";
import { nativePlatform } from "@/lib/native/platform";
import { cn } from "@/lib/utils";

export type OpenInMapsStrings = {
  title: string;
  open: string;
  appleMaps: string;
  googleMaps: string;
  copyAddress: string;
  copied: string;
  copyFailed: string;
};

export type MapPlace = {
  name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

const noop = () => () => {};

const onApplePlatform = () =>
  nativePlatform() === "ios" ||
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const ROW =
  "flex min-h-13 w-full items-center gap-3 rounded-xl px-3.5 text-left text-base font-medium transition-colors hover:bg-canvas-deeper focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none motion-reduce:transition-none";

function Row({
  icon,
  label,
  href,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-canvas-deep text-ink [&>svg]:size-4"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {href ? (
        <ChevronRight
          aria-hidden
          className="size-4 text-ink-faint"
        />
      ) : null}
    </>
  );
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={ROW}
    >
      {body}
    </a>
  ) : (
    <button
      type="button"
      onClick={onClick}
      className={ROW}
    >
      {body}
    </button>
  );
}

export function OpenInMapsSheet({
  place,
  strings,
  words,
  children,
  className,
}: {
  place: MapPlace;
  strings: OpenInMapsStrings;
  words: Locale;
  children: ReactNode;
  className?: string;
}) {
  const apple = useSyncExternalStore(noop, onApplePlatform, () => false);
  const label = place.name?.trim() || place.address?.trim() || "";
  const appleUrl = apple ? appleMapsUrl({ ...place, label: place.name }) : null;
  const googleUrl = googleMapsUrl(place);
  const address = place.address?.trim() || null;

  const copy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(
      () => {
        haptics.success();
        toast.success(strings.copied);
      },
      () => {
        haptics.error();
        toast.error(strings.copyFailed);
      },
    );
  };

  if (!appleUrl && !googleUrl && !address) return <>{children}</>;

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button
          type="button"
          aria-label={formatMessage(strings.open, { place: label }, words)}
          className={cn(
            "block w-full rounded-(--r-cover) text-left transition-transform focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.99] motion-reduce:transition-none",
            className,
          )}
        >
          {children}
        </button>
      </DrawerTrigger>
      <DrawerContent className="bg-canvas-deep data-[vaul-drawer-direction=bottom]:rounded-t-(--r-tile)">
        <DrawerHeader className="gap-1 px-4 pt-4 pb-3 text-left">
          <DrawerTitle className="font-display text-lg font-bold tracking-tight text-ink">
            {strings.title}
          </DrawerTitle>
          <DrawerDescription className="truncate text-2sm text-ink-soft">
            {[place.name?.trim(), address].filter(Boolean).join(" · ")}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-1 px-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {appleUrl ? (
            <Row
              icon={<MapPinned />}
              label={strings.appleMaps}
              href={appleUrl}
            />
          ) : null}
          {googleUrl ? (
            <Row
              icon={<MapIcon />}
              label={strings.googleMaps}
              href={googleUrl}
            />
          ) : null}
          {address ? (
            <Row
              icon={<Copy />}
              label={strings.copyAddress}
              onClick={copy}
            />
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
