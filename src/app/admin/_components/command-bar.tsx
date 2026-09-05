"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useSidebar } from "@/components/ui/sidebar";
import { useSignOut } from "@/components/sign-out-button";
import { groupCommands } from "@/lib/commands";
import type {
  CommandGroup as Group,
  ResolvedCommand,
  ScopeArg,
} from "@/lib/commands";
import { setLocale } from "@/app/actions";
import { ICONS } from "./icons";
import { scopeHref } from "./scope-url";

export type CommandBarStrings = {
  dialogTitle: string;
  dialogDescription: string;
  placeholder: string;
  empty: string;
  groups: Record<Group, string>;
};

/**
 * Every entry here is an accelerator, never the only way to reach something —
 * the sidebar, the switcher, the language picker and the user menu each still
 * offer their own. That is what lets the palette be keyboard-only without
 * stranding anyone who is not using a keyboard.
 */
export function CommandBar({
  commands,
  strings,
}: {
  commands: ResolvedCommand[];
  strings: CommandBarStrings;
}) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();
  const { signOut } = useSignOut();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "k" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      setOpen((previous) => !previous);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const run = (command: ResolvedCommand) => {
    setOpen(false);

    if (command.run.kind === "navigate") {
      router.push(command.run.href);
      return;
    }

    const { id, arg } = command.run;

    switch (id) {
      case "scope.set":
        if (arg) router.push(scopeHref(pathname, arg as ScopeArg));
        return;
      case "sidebar.toggle":
        toggleSidebar();
        return;
      case "locale.set":
        if (!arg) return;
        startTransition(() => {
          document.documentElement.lang = arg;
          return setLocale(arg);
        });
        return;
      case "session.signOut":
        signOut();
        return;
    }
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={strings.dialogTitle}
      description={strings.dialogDescription}
      className="rounded-2xl border-line"
    >
      <CommandInput placeholder={strings.placeholder} />
      <CommandList>
        <CommandEmpty>{strings.empty}</CommandEmpty>
        {groupCommands(commands).map(({ group, commands: entries }, index) => (
          <div key={group}>
            {index > 0 && <CommandSeparator className="bg-line" />}
            <CommandGroup heading={strings.groups[group]}>
              {entries.map((command) => {
                const Icon = ICONS[command.icon];

                return (
                  <CommandItem
                    key={command.id}
                    value={command.label}
                    keywords={[...command.keywords]}
                    onSelect={() => run(command)}
                    className="gap-3 rounded-xl"
                  >
                    <Icon
                      aria-hidden
                      className="text-ink-soft"
                    />
                    <span>{command.label}</span>
                    {command.shortcut && (
                      <CommandShortcut>{command.shortcut}</CommandShortcut>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
