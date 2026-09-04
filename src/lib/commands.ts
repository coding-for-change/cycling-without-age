import type { AdminScope } from "@/lib/access";
import type { Dictionary } from "@/lib/i18n";

/**
 * Icon names, not icon components: a command entry is resolved on the server and
 * handed to a Client Component, so everything on it has to survive JSON. The
 * client owns `Record<IconKey, LucideIcon>`, which makes a missing icon a type
 * error rather than a blank row.
 */
export type IconKey =
  | "overview"
  | "rides"
  | "members"
  | "passengers"
  | "bikes"
  | "chat"
  | "reports"
  | "chapters"
  | "countries"
  | "settings"
  | "help"
  | "admin"
  | "pilot"
  | "passenger"
  | "language"
  | "sidebar"
  | "signOut";

export type CommandActionId =
  "scope.set" | "sidebar.toggle" | "locale.set" | "session.signOut";

/**
 * `scope.set` narrows the current page rather than navigating away, and the
 * pathname it has to preserve is only known in the browser — a Layout cannot
 * read `searchParams`. So the target travels as an argument and the client
 * rewrites the URL. The switcher and the palette share one handler.
 */
export type ScopeArg = "all" | `chapter:${string}` | `country:${string}`;

export type CommandRun =
  | { kind: "navigate"; href: string }
  | { kind: "action"; id: CommandActionId; arg?: string };

export type CommandGroup =
  "create" | "navigate" | "perspective" | "scope" | "account";

export const COMMAND_GROUP_ORDER: readonly CommandGroup[] = [
  "create",
  "navigate",
  "perspective",
  "scope",
  "account",
];

/**
 * `visible` is a predicate over the resolved admin scope rather than a role
 * name, so a command hides on exactly the same condition as the nav item it
 * belongs to. `src/app/admin/commands.test.ts` asserts the two agree.
 */
export type CommandEntry = {
  id: string;
  group: CommandGroup;
  label: string;
  icon: IconKey;
  run: CommandRun;
  keywords?: readonly string[];
  shortcut?: string;
  visible?: (scope: AdminScope) => boolean;
};

/**
 * What a feature slice exports from its `commands.ts`. It takes the dictionary
 * because labels are resolved on the server — the palette receives finished
 * strings, never keys, and a slice is free to reuse `admin.nav.*` for the
 * destination it owns instead of inventing a second wording for it.
 */
export type CommandContributor = (dict: Dictionary) => CommandEntry[];

/** The serializable form that crosses into the palette. */
export type ResolvedCommand = Omit<CommandEntry, "visible" | "keywords"> & {
  keywords: string[];
};

export function collectCommands(
  entries: readonly CommandEntry[],
  scope: AdminScope,
): ResolvedCommand[] {
  return entries
    .filter((entry) => entry.visible?.(scope) ?? true)
    .map(({ id, group, label, icon, run, shortcut, keywords }) => ({
      id,
      group,
      label,
      icon,
      run,
      shortcut,
      keywords: [...(keywords ?? [])],
    }));
}

export const groupCommands = (commands: readonly ResolvedCommand[]) =>
  COMMAND_GROUP_ORDER.map((group) => ({
    group,
    commands: commands.filter((c) => c.group === group),
  })).filter(({ commands }) => commands.length > 0);
