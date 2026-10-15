import { availablePerspectives, type Access } from "@/lib/access";
import { PERSPECTIVE_HOME } from "@/lib/redirects";

export function memberHomeOf(access: Access) {
  const perspective = availablePerspectives(access).find(
    (candidate) => candidate !== "admin",
  );
  return perspective ? PERSPECTIVE_HOME[perspective] : null;
}

export const adminPersonHref = (subject: {
  kind: "user" | "passenger";
  id: string;
}) =>
  subject.kind === "user"
    ? `/admin/members/${subject.id}`
    : `/admin/passengers/${subject.id}`;
