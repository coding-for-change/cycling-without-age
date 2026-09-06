import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The dark-mint hero action at the end of an onboarding step: the label on the
 * left, the icon in a translucent disc on the right. Mint is the caretaking
 * colour, so this is the "you are done here" button rather than a red one.
 */
export function MintPillButton({
  label,
  icon: Icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="lg"
      disabled={disabled}
      onClick={onClick}
      className="relative h-16 w-full justify-start rounded-full bg-mint-deep pr-20 pl-7 text-base font-bold text-white shadow-lift hover:bg-mint-deep/90"
    >
      {label}
      <span
        aria-hidden
        className="absolute top-1/2 right-2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/15"
      >
        <Icon className="size-5" />
      </span>
    </Button>
  );
}
