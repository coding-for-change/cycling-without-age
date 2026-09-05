"use client";

import { useState, type ReactNode } from "react";
import { KeyRound } from "lucide-react";
import type { Locale } from "@/lib/format";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import {
  PasskeyManager,
  type PasskeyManagerStrings,
} from "@/components/passkey-manager";

export type AccountStrings = PasskeyManagerStrings & {
  title: string;
  passkeys: string;
  passkeysBody: string;
};

type Section = "passkeys";

// ponytail: one section today; personal settings land here as further entries.
const SECTIONS: { key: Section; icon: typeof KeyRound }[] = [
  { key: "passkeys", icon: KeyRound },
];

export function AccountDialog({
  strings,
  locale,
  trigger,
  open,
  onOpenChange,
}: {
  strings: AccountStrings;
  locale: Locale;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [section, setSection] = useState<Section>("passkeys");

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="overflow-hidden p-0 md:max-h-[560px] md:max-w-[720px] lg:max-w-[800px]">
        <DialogTitle className="sr-only">{strings.title}</DialogTitle>
        <DialogDescription className="sr-only">
          {strings.passkeysBody}
        </DialogDescription>
        <SidebarProvider className="min-h-0 items-start">
          <Sidebar
            collapsible="none"
            className="hidden md:flex"
          >
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {SECTIONS.map((item) => (
                      <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton
                          isActive={item.key === section}
                          onClick={() => setSection(item.key)}
                          className="min-h-11"
                        >
                          <item.icon aria-hidden />
                          <span>{strings[item.key]}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <div className="flex h-[520px] flex-1 flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center px-4">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <span className="text-ink-soft">{strings.title}</span>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{strings[section]}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 pt-0">
              <p className="text-sm text-ink-soft">{strings.passkeysBody}</p>
              <PasskeyManager
                strings={strings}
                locale={locale}
              />
            </div>
          </div>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
}
