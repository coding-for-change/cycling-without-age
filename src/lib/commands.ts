import type { AdminScope } from "@/lib/access";
import type { Dictionary } from "@/lib/i18n";

export type IconKey =
  | "overview"
  | "home"
  | "calendar"
  | "training"
  | "rides"
  | "members"
  | "passengers"
  | "bikes"
  | "locations"
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

export type CommandContributor = (dict: Dictionary) => CommandEntry[];

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
