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

const ROWS = ["w-16", "w-20", "w-24", "w-14"];

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
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function MemberSidebarSkeleton() {
  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
    >
      <SidebarHeader className="pt-safe">
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
      <SidebarFooter className="pb-safe">
        <Identity />
      </SidebarFooter>
    </Sidebar>
  );
}
