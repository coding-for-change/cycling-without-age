"use client";

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
import { cn } from "@/lib/utils";
import { LegalDocumentPane } from "./legal-document-pane";
import { PerspectiveRow } from "./perspective-row";
import { ProfileHeader } from "./profile-header";
import { accountSections, AccountSectionBody, sectionTitle } from "./sections";
import { profileHref, type AccountChromeProps } from "./types";

export function AccountDialog({
  data,
  activePerspective,
  open,
  onOpenChange,
  trigger,
  section,
  onSectionChange,
  legalDocument,
  onCloseLegalDocument,
}: AccountChromeProps) {
  const strings = data.strings;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        onEscapeKeyDown={(event) => {
          if (!legalDocument) return;
          event.preventDefault();
          onCloseLegalDocument();
        }}
        className="overflow-hidden p-0 md:max-h-[560px] md:max-w-[720px] lg:max-w-[800px]"
      >
        <DialogTitle className="sr-only">{strings.title}</DialogTitle>
        <DialogDescription className="sr-only">
          {strings.description}
        </DialogDescription>
        <SidebarProvider className="h-[520px] min-h-0">
          <Sidebar
            collapsible="none"
            className="hidden md:flex"
          >
            <SidebarContent>
              <SidebarHeader className="shrink-0 gap-4 px-4 pt-6 pb-2">
                <ProfileHeader
                  name={data.profile.name}
                  email={data.profile.email}
                  avatar={data.profile.avatarAnimated}
                  photoUrl={data.profile.photoUrl}
                  href={profileHref(data.profile.href, activePerspective)}
                  linkLabel={data.profile.linkLabel}
                  people={data.profile.people}
                  onNavigate={() => onOpenChange(false)}
                />
                <PerspectiveRow
                  data={data}
                  activePerspective={activePerspective}
                  onOpenChange={onOpenChange}
                />
              </SidebarHeader>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {accountSections(data).map((item) => (
                      <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton
                          isActive={item.key === section}
                          onClick={() => onSectionChange(item.key)}
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
          <div
            className={cn(
              "flex h-full min-w-0 flex-1 flex-col overflow-hidden",
              legalDocument ? "bg-canvas" : "bg-canvas-deep",
            )}
          >
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
            <div
              key={legalDocument?.name ?? section}
              className="flex flex-1 flex-col gap-5 overflow-y-auto p-4 pt-0"
            >
              {legalDocument ? (
                <LegalDocumentPane
                  legalDocument={legalDocument}
                  data={data}
                  onBack={onCloseLegalDocument}
                />
              ) : (
                <AccountSectionBody
                  section={section}
                  data={data}
                />
              )}
            </div>
          </div>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
}
