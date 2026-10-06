import { redirect } from "next/navigation";
import { parseSubjectSlug, subjectSlug } from "@/features/person-profiles";
import { getSession } from "@/lib/auth-guards";
import { adminPersonHref, memberHomeOf } from "@/lib/profile-routes";
import { signInHref } from "@/lib/redirects";

type Params = { params: Promise<{ ref: string }> };

export async function GET(_request: Request, { params }: Params) {
  const subject = parseSubjectSlug((await params).ref);
  if (!subject) redirect("/profile");
  const slug = subjectSlug(subject);

  const session = await getSession();
  if (!session) redirect(signInHref(`/profile/${slug}`));

  const home = memberHomeOf(session.access);
  redirect(home ? `${home}/profile/${slug}` : adminPersonHref(subject));
}
