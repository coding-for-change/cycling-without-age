import Link from "next/link";
import { Plus } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { requireAdminScope } from "@/lib/auth-guards";
import { getDictionary } from "@/lib/i18n";
import { resolveNav } from "../nav";
import {
  defaultScopeArg,
  perspectiveChoices,
  roleLabel,
  scopeChoices,
} from "../scopes";
import { AdminNav } from "./admin-nav";
import { AdminUserMenu } from "./admin-user-menu";
import { CommandHint } from "./command-hint";
import { ScopeSwitcher } from "./scope-switcher";

export async function AdminSidebar() {
  const [{ session, scope }, dict] = await Promise.all([
    requireAdminScope(),
    getDictionary(),
  ]);

  const items = resolveNav(scope, dict.admin.nav);
  const inGroup = (group: string) => items.filter((i) => i.group === group);

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
    >
      <SidebarHeader className="pt-[env(safe-area-inset-top)]">
        <ScopeSwitcher
          perspectives={perspectiveChoices(session.access, dict)}
          activePerspective="admin"
          scopes={scopeChoices(scope, dict)}
          defaultScope={defaultScopeArg(scope)}
          roleLabel={roleLabel(session.access, dict)}
          strings={dict.admin.scope}
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip={dict.admin.newRide}
                  className="bg-red font-medium text-white hover:bg-red-hover hover:text-white focus-visible:ring-ink active:bg-red-hover active:text-white"
                >
                  <Link href="/admin/rides">
                    <Plus aria-hidden />
                    <span>{dict.admin.newRide}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <AdminNav
          items={inGroup("main")}
          groupLabel={dict.admin.navLabel}
        />
        <AdminNav
          items={inGroup("organisation")}
          label={dict.admin.navGroups.organisation}
          groupLabel={dict.admin.navGroups.organisation}
        />
      </SidebarContent>

      <SidebarFooter className="pb-[env(safe-area-inset-bottom)]">
        <AdminNav
          items={inGroup("footer")}
          groupLabel={dict.admin.navGroups.footer}
        />
        <CommandHint label={dict.admin.commands.hint} />
        <AdminUserMenu
          name={session.user.name}
          email={session.user.email}
          image={session.user.image}
          strings={{
            ...dict.admin.user,
            signOut: dict.common.signOut,
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
