import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Deliberately not built on `SidebarMenuSkeleton`: it picks its row widths with
 * `Math.random()`, and this markup is a Suspense fallback that gets prerendered
 * into the static shell, where an unstable value is a build error. Fixed widths
 * also mean the placeholder does not twitch between loads.
 */
const ROWS = ["w-24", "w-16", "w-20", "w-28", "w-14", "w-20"];

function Row({ width }: { width: string }) {
  return (
    <SidebarMenuItem className="flex h-8 items-center gap-2 px-2">
      <Skeleton className="size-4 rounded-md" />
      <Skeleton className={`h-3.5 ${width}`} />
    </SidebarMenuItem>
  );
}

function Identity() {
  return (
    <div className="flex items-center gap-2 p-2">
      <Skeleton className="size-8 rounded-lg" />
      <div className="grid flex-1 gap-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function AdminSidebarSkeleton() {
  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
    >
      <SidebarHeader className="pt-[env(safe-area-inset-top)]">
        <Identity />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <Skeleton className="h-8 w-full rounded-md" />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {ROWS.map((width, row) => (
                <Row
                  key={row}
                  width={width}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="pb-[env(safe-area-inset-bottom)]">
        <Identity />
      </SidebarFooter>
    </Sidebar>
  );
}
