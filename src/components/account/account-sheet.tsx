"use client";

import type { ReactNode } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { SaveStatus } from "@/components/save-status";
import type { Perspective } from "@/lib/access";
import { PerspectiveRow } from "./perspective-row";
import { ProfileHeader } from "./profile-header";
import { ACCOUNT_SECTIONS, AccountSectionBody, sectionTitle } from "./sections";
import type { AccountData } from "./types";

/**
 * The phone chrome: one sheet that scrolls, every section stacked, because a
 * left nav on a phone is a second tap for nothing. The same sections as the
 * dialog — only the frame differs.
 */
export function AccountSheet({
  data,
  activePerspective,
  open,
  onOpenChange,
  trigger,
}: {
  data: AccountData;
  activePerspective?: Perspective;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactNode;
}) {
  const strings = data.strings;

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction="bottom"
      repositionInputs={false}
    >
      {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
      <DrawerContent className="bg-canvas data-[vaul-drawer-direction=bottom]:max-h-[94svh] data-[vaul-drawer-direction=bottom]:rounded-t-(--r-tile)">
        <DrawerHeader className="shrink-0 gap-1 border-b border-line px-5 py-4 text-left">
          <div className="flex items-center justify-between gap-3">
            <DrawerTitle className="font-display text-lg font-bold tracking-tight text-ink">
              {strings.title}
            </DrawerTitle>
            <SaveStatus
              labels={strings.status}
              words={data.language}
            />
          </div>
          <DrawerDescription className="sr-only">
            {strings.description}
          </DrawerDescription>
        </DrawerHeader>
        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <ProfileHeader
            name={data.profile.name}
            email={data.profile.email}
            avatar={data.profile.avatarAnimated}
          />
          <PerspectiveRow
            data={data}
            activePerspective={activePerspective}
            onOpenChange={onOpenChange}
          />
          {ACCOUNT_SECTIONS.map((item) => (
            <section
              key={item.key}
              className="grid gap-3 rounded-2xl border border-line p-4"
            >
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <item.icon
                  aria-hidden
                  className="size-4 text-ink-soft"
                />
                {sectionTitle(strings, item.key)}
              </h2>
              <AccountSectionBody
                section={item.key}
                data={data}
              />
            </section>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
