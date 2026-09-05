import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

export function PersonAvatar({
  name,
  email,
  image,
  size = "default",
}: {
  name: string;
  email: string;
  image?: string | null;
  size?: "default" | "lg";
}) {
  return (
    <Avatar size={size}>
      {image ? (
        <AvatarImage
          src={image}
          alt=""
        />
      ) : null}
      <AvatarFallback className="bg-mint-tint text-xs font-semibold text-ink">
        {getInitials(name || email)}
      </AvatarFallback>
    </Avatar>
  );
}
