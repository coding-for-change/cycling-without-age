import { headers } from "next/headers";
import { chat } from "@/features/chat";
import { getSession } from "@/lib/auth-guards";
import { getDictionary } from "@/lib/i18n";
import { isNativeIosUserAgent } from "@/lib/native/user-agent";
import { resolveMemberNav, type MemberPerspective } from "../nav";
import { MobileTabBar } from "./mobile-tab-bar";
import { NativeSwipeBack } from "./native-swipe-back";
import { NativeTabBar } from "./native-tab-bar";

export async function MemberTabBar({
  perspective,
}: {
  perspective: MemberPerspective;
}) {
  const [dict, session, requestHeaders] = await Promise.all([
    getDictionary(),
    getSession(),
    headers(),
  ]);
  const unread = session
    ? await chat.countUnreadConversations(session.user.id)
    : 0;
  const items = resolveMemberNav(perspective, dict.member.nav);
  const badges = { chat: unread };

  if (isNativeIosUserAgent(requestHeaders.get("user-agent"))) {
    return (
      <>
        <NativeTabBar
          items={items}
          badges={badges}
        />
        <NativeSwipeBack items={items} />
      </>
    );
  }

  return (
    <MobileTabBar
      items={items}
      label={dict.member.tabBarLabel}
      badges={badges}
    />
  );
}
