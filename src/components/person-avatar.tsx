import { Avatar } from "@/components/ui/avatar";

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
