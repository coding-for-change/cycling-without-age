import { requireAdminScope } from "@/lib/auth-guards";
import { availablePerspectives } from "@/lib/access";
import { getDictionary, getLocale } from "@/lib/i18n";
import { adminCommands } from "../commands";
import { CommandBar } from "./command-bar";

export async function AdminCommandBar() {
  const [{ session, scope }, dict, locale] = await Promise.all([
    requireAdminScope(),
    getDictionary(),
    getLocale(),
  ]);

  return (
    <CommandBar
      commands={adminCommands(dict, scope, {
        perspectives: availablePerspectives(session.access),
        locale,
      })}
      strings={dict.admin.commands}
    />
  );
}
