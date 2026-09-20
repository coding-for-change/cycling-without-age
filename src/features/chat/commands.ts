import type { CommandContributor } from "@/lib/commands";

export const commands: CommandContributor = (dict) => [
  {
    id: "chat",
    group: "navigate",
    label: dict.admin.nav.chat,
    icon: "chat",
    run: { kind: "navigate", href: "/admin/chat" },
    keywords: ["chat", "messages", "conversations", "inbox"],
  },
  {
    id: "new-message",
    group: "create",
    label: dict.chat.newChat.title,
    icon: "chat",
    run: { kind: "navigate", href: "/admin/chat?new=1" },
    keywords: ["write", "message", "start", "conversation"],
  },
];
