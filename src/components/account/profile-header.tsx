import { PersonAvatar } from "@/components/person-avatar";
import { cn } from "@/lib/utils";

export function ProfileHeader({
  name,
  email,
  avatar,
  className,
}: {
  name: string;
  email: string;
  avatar: string;
  className?: string;
}) {
  return (
    <div
      className={cn("grid justify-items-center gap-3 text-center", className)}
    >
      <PersonAvatar
        svg={avatar}
        className="size-20"
      />
      <div className="grid w-full leading-tight">
        <span className="truncate text-sm font-medium">{name}</span>
        <span className="truncate text-xs text-ink-soft">{email}</span>
      </div>
    </div>
  );
}
