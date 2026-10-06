import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-guards";
import { memberHomeOf } from "@/lib/profile-routes";
import { signInHref } from "@/lib/redirects";

export async function GET() {
  const session = await getSession();
  if (!session) redirect(signInHref("/profile"));

  const home = memberHomeOf(session.access);
  redirect(home ? `${home}/profile` : "/admin");
}
