import type { CommandContributor } from "@/lib/commands";

export const commands: CommandContributor = (dict) => [
  {
    id: "training",
    group: "navigate",
    label: dict.admin.nav.training,
    icon: "training",
    run: { kind: "navigate", href: "/admin/training" },
    keywords: [
      "training",
      "course",
      "video",
      "lesson",
      "quiz",
      "onboarding",
      "mandatory",
      "required",
      "progress",
    ],
  },
  {
    id: "new-course",
    group: "create",
    label: dict.admin.commands.newCourse,
    icon: "training",
    run: { kind: "navigate", href: "/admin/training?new=1" },
    keywords: ["course", "training", "lesson", "quiz", "new"],
  },
];
