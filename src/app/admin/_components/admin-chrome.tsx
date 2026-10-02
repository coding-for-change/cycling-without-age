import { Suspense } from "react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { NotificationBellSkeleton } from "@/components/notifications/notification-bell-skeleton";
import { requireAdminScope } from "@/lib/auth-guards";
import { getDictionary, getLocale } from "@/lib/i18n";
import { resolveNav } from "../nav";
import { scopeChoices } from "../scopes";
import { scopeArgOf, storedActiveScope } from "../scope-cookie";
import { AdminTopBar } from "./admin-top-bar";

export async function AdminChrome() {
  const [{ scope }, dict, locale] = await Promise.all([
    requireAdminScope(),
    getDictionary(),
    getLocale(),
  ]);

  const scopes = scopeChoices(scope, dict, locale);
  const active = scopeArgOf(await storedActiveScope(scope));

  return (
    <AdminTopBar
      items={resolveNav(scope, dict.admin.nav)}
      scopes={scopes}
      defaultScope={active}
      locale={locale}
      languageLabel={dict.common.language}
      menuLabel={dict.admin.openMenu}
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
