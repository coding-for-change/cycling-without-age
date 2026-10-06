import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function PersonAvatar({
  svg,
  photoUrl,
  size = "default",
  className,
}: {
  svg: string;
  photoUrl?: string | null;
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  const character = (
    <span
      aria-hidden
      className="size-full [&>svg]:size-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );

  return (
    <Avatar
      size={size}
      className={className}
    >
      {photoUrl ? (
        <>
          <AvatarImage
            src={photoUrl}
            alt=""
            className="object-cover"
          />
          <AvatarFallback className="bg-transparent">
            {character}
          </AvatarFallback>
        </>
      ) : (
        character
      )}
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
