import { chat } from "@/features/chat";
import { getSession } from "@/lib/auth-guards";
import { getDictionary } from "@/lib/i18n";
import { resolveMemberNav, type MemberPerspective } from "../nav";
import { MobileTabBar } from "./mobile-tab-bar";

export async function MemberTabBar({
  perspective,
}: {
  perspective: MemberPerspective;
}) {
  const [dict, session] = await Promise.all([getDictionary(), getSession()]);
  const unread = session
    ? await chat.countUnreadConversations(session.user.id)
    : 0;

  return (
    <MobileTabBar
      items={resolveMemberNav(perspective, dict.member.nav)}
      label={dict.member.tabBarLabel}
      badges={{ chat: unread }}
    />
  );
}
