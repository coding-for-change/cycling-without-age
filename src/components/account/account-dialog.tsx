"use client";

import { useState, type ReactNode } from "react";
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { SaveStatus } from "@/components/save-status";
import type { Perspective } from "@/lib/access";
import { PerspectiveRow } from "./perspective-row";
import { ProfileHeader } from "./profile-header";
import {
  ACCOUNT_SECTIONS,
  AccountSectionBody,
  sectionTitle,
  type AccountSectionKey,
} from "./sections";
import type { AccountData } from "./types";

/**
 * The desk chrome: the person and their hats on the left, one section at a time
 * on the right. Closed, it renders nothing but its trigger — so the passkey list
 * is only ever fetched by someone actually looking at it.
 */
export function AccountDialog({
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
  const [section, setSection] = useState<AccountSectionKey>("profile");
  const strings = data.strings;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="overflow-hidden p-0 md:max-h-[560px] md:max-w-[720px] lg:max-w-[800px]">
        <DialogTitle className="sr-only">{strings.title}</DialogTitle>
        <DialogDescription className="sr-only">
          {strings.description}
        </DialogDescription>
        <SidebarProvider className="min-h-0 items-start">
          <Sidebar
            collapsible="none"
            className="hidden md:flex"
          >
            <SidebarHeader className="gap-4 px-4 pt-6 pb-2">
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
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {ACCOUNT_SECTIONS.map((item) => (
                      <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton
                          isActive={item.key === section}
                          onClick={() => setSection(item.key)}
                          className="min-h-11"
                        >
                          <item.icon aria-hidden />
                          <span>{sectionTitle(strings, item.key)}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <div className="flex h-[520px] flex-1 flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center justify-between gap-3 px-4">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <span className="text-ink-soft">{strings.title}</span>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>
                      {sectionTitle(strings, section)}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <SaveStatus
                labels={strings.status}
                words={data.language}
              />
            </header>
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 pt-0">
              <AccountSectionBody
                section={section}
                data={data}
              />
            </div>
          </div>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
}
