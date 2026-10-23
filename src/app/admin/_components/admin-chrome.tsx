import { Suspense } from "react";
import { loadAccount } from "@/components/account/load-account";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { NotificationBellSkeleton } from "@/components/notifications/notification-bell-skeleton";
import { requireAdminScope } from "@/lib/auth-guards";
import { getDictionary, getLocale } from "@/lib/i18n";
import { resolveNav } from "../nav";
import { scopeChoices } from "../scopes";
import { scopeArgOf, storedActiveScope } from "../scope-cookie";
import { AdminTopBar } from "./admin-top-bar";

export async function AdminChrome() {
  const [{ scope }, dict, locale, account] = await Promise.all([
    requireAdminScope(),
    getDictionary(),
    getLocale(),
    loadAccount(),
  ]);

  const scopes = scopeChoices(scope, dict, locale);
  const stored = await storedActiveScope(scope);
  const active = scopeArgOf(stored);

  return (
    <AdminTopBar
      items={resolveNav(scope, dict.admin.nav, stored)}
      scopes={scopes}
      defaultScope={active}
      locale={locale}
      languageLabel={dict.common.language}
      themeStrings={dict.common.theme}
      menuLabel={dict.admin.openMenu}
      account={account}
      accountStrings={dict.member.topBar.pilot}
      bell={
        <Suspense
          key="bell"
          fallback={<NotificationBellSkeleton className="size-9" />}
        >
          <NotificationBell className="size-9" />
        </Suspense>
      }
    />
  );
}
