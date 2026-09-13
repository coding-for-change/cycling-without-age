import { Suspense } from "react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { NotificationBellSkeleton } from "@/components/notifications/notification-bell-skeleton";
import { requireAdminScope } from "@/lib/auth-guards";
import { getDictionary, getLocale } from "@/lib/i18n";
import { resolveNav } from "../nav";
import { defaultScopeArg, scopeChoices } from "../scopes";
import { AdminTopBar } from "./admin-top-bar";

export async function AdminChrome() {
  const [{ scope }, dict, locale] = await Promise.all([
    requireAdminScope(),
    getDictionary(),
    getLocale(),
  ]);

  const scopes = scopeChoices(scope, dict);
  const active = defaultScopeArg(scope);

  return (
    <AdminTopBar
      items={resolveNav(scope, dict.admin.nav)}
      scopes={scopes}
      defaultScope={active}
      locale={locale}
      languageLabel={dict.common.language}
      bell={
        <Suspense fallback={<NotificationBellSkeleton className="size-9" />}>
          <NotificationBell className="size-9" />
        </Suspense>
      }
    />
  );
}
