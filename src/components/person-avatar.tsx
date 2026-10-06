import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function PersonAvatar({
  svg,
  size = "default",
  className,
}: {
  svg: string;
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  return (
    <Avatar
      size={size}
      className={className}
    >
      <span
        aria-hidden
        className="size-full [&>svg]:size-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </Avatar>
  );
}

const CHIP = "flex min-w-0 flex-1 items-center gap-2 text-2sm";

export function PersonChip({
  name,
  avatar,
  href,
}: {
  name: string;
  avatar: string;
  href?: string | null;
}) {
  const body = (
    <>
      <PersonAvatar
        svg={avatar}
        size="sm"
        className="size-5"
      />
      <span className="truncate">{name}</span>
    </>
  );
  return href ? (
    <Link
      href={href}
      className={cn(CHIP, "rounded-md underline-offset-2 hover:underline")}
    >
      {body}
    </Link>
  ) : (
    <span className={CHIP}>{body}</span>
  );
}
