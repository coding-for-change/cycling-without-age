"use client";

import { useRouter } from "next/navigation";
import { Bike, Wind } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/native/haptics";
import { Step, type StepProgress } from "../../_components/step";
import { useFlow, type FlowRole } from "../../_components/flow-state";

type Strings = {
  title: string;
  pilot: { title: string; body: string };
  passenger: { title: string; body: string };
};

export function RoleStep({
  strings,
  progress,
}: {
  strings: Strings;
  progress: StepProgress | null;
}) {
  const router = useRouter();
  const { update } = useFlow();

  const choose = (role: FlowRole) => {
    haptics.tap();
    update({ role });

    router.push(`/location?as=${role}`, { transitionTypes: ["nav-forward"] });
  };

  const options = [
    {
      role: "passenger" as const,
      icon: Wind,
      hero: true,
      ...strings.passenger,
    },
    { role: "pilot" as const, icon: Bike, hero: false, ...strings.pilot },
  ];

  return (
    <Step
      title={strings.title}
      progress={progress ?? undefined}
    >
      <div className="space-y-3">
        {options.map(({ role, icon: Icon, hero, title, body }) => (
          <button
            key={role}
            type="button"
            onClick={() => choose(role)}
            className={cn(
              "flex w-full items-start rounded-(--r-card) border text-left transition-colors focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none",
              hero
                ? "gap-4 border-transparent bg-mint-tint p-6 hover:bg-mint/50"
                : "gap-3 border-line bg-canvas p-4 hover:bg-canvas-deep",
            )}
          >
            <span
              className={cn(
                "grid shrink-0 place-items-center rounded-full bg-mint",
                hero ? "size-13" : "size-9",
              )}
            >
              <Icon
                className={cn("text-ink", hero ? "size-6" : "size-4.5")}
                aria-hidden
              />
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "block font-display font-bold text-ink",
                  hero ? "text-2xl" : "text-base",
                )}
              >
                {title}
              </span>
              <span
                className={cn(
                  "block text-ink-soft",
                  hero ? "mt-1.5 text-base" : "mt-0.5 text-sm",
                )}
              >
                {body}
              </span>
            </span>
          </button>
        ))}
      </div>
    </Step>
  );
}
