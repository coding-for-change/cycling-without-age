import { Mail } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";

const address = z.email();

/**
 * The address stays on screen as plain text next to the button: not every
 * phone has a mail app set up, and a relative may want to copy it elsewhere.
 * It is checked again before it becomes a link, so nothing but an address —
 * no `?`, `&` or `#` smuggled into the settings — can shape the mailto URL.
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
  const linkable = address.safeParse(email).success;
  return (
    <div className="flex flex-col items-center gap-1.25 sm:items-start">
      {linkable ? (
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
      ) : null}
      <span className="text-2sm break-all text-ink-soft select-all">
        {email}
      </span>
    </div>
  );
}
