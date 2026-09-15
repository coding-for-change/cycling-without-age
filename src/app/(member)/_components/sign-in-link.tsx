import Link from "next/link";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SignInLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Button
      asChild
      variant="outline"
      className={cn("min-h-11 gap-2 rounded-full border-line px-4", className)}
    >
      <Link href={href}>
        <LogIn
          className="size-4"
          aria-hidden
        />
        {label}
      </Link>
    </Button>
  );
}
