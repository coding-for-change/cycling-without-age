import Link from "next/link";
import { Button } from "@/components/ui/button";
import { perspectiveViewerSession } from "@/lib/auth-guards";
import { cacheLife } from "next/cache";
import { getDictionary } from "@/lib/i18n";
import { PERSPECTIVE_HOME } from "@/lib/redirects";
import { fill, firstName } from "@/lib/utils";
import { primaryAction, type MemberPerspective } from "../../nav";
import { MEMBER_LIFE } from "../instant";
import { signInHref } from "../sign-in-href";

/**
 * The top of the home screen: who is reading, what this place is for, and the
 * one red action. The action is `md:hidden` because the sidebar already carries
 * it on a desktop — two reds on one screen is one too many.
 */
export async function Greeting({
  perspective,
}: {
  perspective: MemberPerspective;
}) {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const [session, dict] = await Promise.all([
    perspectiveViewerSession(perspective),
    getDictionary(),
  ]);
  const { guest, home, action } = dict.member;

  const heading = session
    ? fill(home.greeting, { name: firstName(session.user.name) })
    : guest.greeting;
  const tagline = session ? home[perspective].tagline : guest.tagline;
  const hero = session
    ? { href: primaryAction(perspective).href, label: action[perspective] }
    : {
        href: signInHref(PERSPECTIVE_HOME[perspective]),
        label: guest.hero,
      };

  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-2xl tracking-tight md:text-3xl">{heading}</h1>
      <p className="text-ink-soft">{tagline}</p>
      <Button
        asChild
        variant="brand"
        size="hero"
        className="mt-2 md:hidden"
      >
        <Link href={hero.href}>{hero.label}</Link>
      </Button>
      {session ? null : (
        <p className="text-sm text-ink-soft md:hidden">{guest.heroHint}</p>
      )}
    </section>
  );
}
