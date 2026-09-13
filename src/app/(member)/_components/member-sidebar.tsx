import Link from "next/link";
import { headers } from "next/headers";
import { LogIn } from "lucide-react";
import { loadAccount } from "@/components/account/load-account";
import { ICONS } from "@/components/icons";
import { UserMenu } from "@/components/user-menu";
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
import { perspectiveViewerSession } from "@/lib/auth-guards";
import { getDictionary } from "@/lib/i18n";
import { perspectiveChoices } from "@/lib/perspectives";
import { PERSPECTIVE_HOME, safeNextPath } from "@/lib/redirects";
import { fill } from "@/lib/utils";
import { getMemberHome } from "@/use-cases/member-home";
import {
  primaryAction,
  resolveMemberNav,
  type MemberPerspective,
} from "../nav";
import { MemberNav } from "./member-nav";
import { PerspectiveSwitcher } from "./perspective-switcher";
import { signInHref } from "./sign-in-href";

export async function MemberSidebar({
  perspective,
}: {
  perspective: MemberPerspective;
}) {
  const [session, dict, head, account] = await Promise.all([
    perspectiveViewerSession(perspective),
    getDictionary(),
    headers(),
    loadAccount(),
  ]);

  const home = session ? await getMemberHome(session.user.id) : null;
  const chapterNames = (home?.memberships ?? [])
    .map(
      (member) =>
        home?.chapters.find((chapter) => chapter.id === member.chapterId)?.name,
    )
    .filter((name) => name !== undefined);

  const subtitle = !session
    ? dict.member.guest.subtitle
    : chapterNames.length === 1
      ? chapterNames[0]
      : chapterNames.length > 1
        ? fill(dict.member.perspective.chapters, {
            count: chapterNames.length,
          })
        : dict.member.perspective.noChapter;

  const action = primaryAction(perspective);
  const ActionIcon = ICONS[action.icon];
  const actionLabel = dict.member.action[perspective];
  const next =
    safeNextPath(head.get("x-pathname")) ?? PERSPECTIVE_HOME[perspective];

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
    >
      <SidebarHeader className="pt-safe">
        <PerspectiveSwitcher
          perspectives={session ? perspectiveChoices(session.access, dict) : []}
          activePerspective={perspective}
          label={dict.admin.perspectives[perspective]}
          subtitle={subtitle}
          strings={{
            switchLabel: dict.member.perspective.switchLabel,
            label: dict.member.perspective.label,
          }}
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip={actionLabel}
                  className="bg-red font-medium text-white hover:bg-red-hover hover:text-white focus-visible:ring-ink active:bg-red-hover active:text-white"
                >
                  <Link href={action.href}>
                    <ActionIcon aria-hidden />
                    <span>{actionLabel}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <MemberNav
          items={resolveMemberNav(perspective, dict.member.nav)}
          groupLabel={dict.member.navLabel}
        />
      </SidebarContent>

      <SidebarFooter className="pb-safe">
        {account ? (
          <UserMenu
            data={account}
            activePerspective={perspective}
            strings={{
              ...dict.member.user[perspective],
              signOut: dict.common.signOut,
            }}
          />
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip={dict.member.guest.signIn}
              >
                <Link href={signInHref(next)}>
                  <LogIn aria-hidden />
                  <span>{dict.member.guest.signIn}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
