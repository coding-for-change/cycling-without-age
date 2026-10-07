import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The address stays on screen as plain text next to the button: not every
 * phone has a mail app set up, and a relative may want to copy it elsewhere.
 */
export function ChapterMail({
  email,
  subject,
  label,
}: {
  email: string;
  subject: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.25 sm:items-start">
      <Button
        asChild
        variant="outline"
        className="min-h-11 rounded-full border-line"
      >
        <a href={`mailto:${email}?subject=${encodeURIComponent(subject)}`}>
          <Mail aria-hidden />
          {label}
        </a>
      </Button>
      <span className="text-2sm break-all text-ink-soft select-all">
        {email}
      </span>
    </div>
  );
}
