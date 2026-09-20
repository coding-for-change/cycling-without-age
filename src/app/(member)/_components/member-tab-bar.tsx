import { getDictionary } from "@/lib/i18n";
import { resolveMemberNav, type MemberPerspective } from "../nav";
import { MobileTabBar } from "./mobile-tab-bar";

export async function MemberTabBar({
  perspective,
}: {
  perspective: MemberPerspective;
}) {
  const dict = await getDictionary();

  return (
    <MobileTabBar
      items={resolveMemberNav(perspective, dict.member.nav)}
      label={dict.member.tabBarLabel}
    />
  );
}
