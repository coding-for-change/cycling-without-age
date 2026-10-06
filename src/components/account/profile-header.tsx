import Link from "next/link";
import { ChevronRight, HeartHandshake } from "lucide-react";
import { PersonAvatar } from "@/components/person-avatar";
import { cn } from "@/lib/utils";

export function ProfileHeader({
  name,
  email,
  avatar,
  photoUrl,
  href,
  linkLabel,
  people,
  onNavigate,
  className,
}: {
  name: string;
  email: string;
  avatar: string;
  photoUrl?: string | null;
  href?: string | null;
  linkLabel?: string;
  people?: { href: string; label: string } | null;
  onNavigate?: () => void;
  className?: string;
}) {
  const body = (
    <>
      <PersonAvatar
        svg={avatar}
        photoUrl={photoUrl}
        className="size-20"
      />
      <span className="grid w-full leading-tight">
        <span className="truncate text-sm font-medium">{name}</span>
        <span className="truncate text-xs text-ink-soft">{email}</span>
      </span>
      {href && linkLabel ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-ink">
          {linkLabel}
          <ChevronRight
            aria-hidden
            className="size-3.5"
          />
        </span>
      ) : null}
    </>
  );

  const layout = cn("grid justify-items-center gap-3 text-center", className);

  const header = !href ? (
    <div className={layout}>{body}</div>
  ) : (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        layout,
        "rounded-2xl p-2 outline-none transition-colors hover:bg-canvas-deeper focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none",
      )}
    >
      {body}
    </Link>
  );

  if (!people) return header;

  return (
    <div className="grid gap-1.25">
      {header}
      <Link
        href={people.href}
        onClick={onNavigate}
        className="mx-auto inline-flex items-center gap-1.25 rounded-full px-3 py-1.25 text-xs font-medium text-ink outline-none transition-colors hover:bg-canvas-deeper focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none"
      >
        <HeartHandshake
          aria-hidden
          className="size-3.5"
        />
        {people.label}
        <ChevronRight
          aria-hidden
          className="size-3.5"
        />
      </Link>
    </div>
  );
}
