import Link from "next/link";
import { Button } from "@/components/ui/button";
import { perspectiveViewerSession } from "@/lib/auth-guards";
import { cacheLife } from "next/cache";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { PERSPECTIVE_HOME } from "@/lib/redirects";
import { firstName } from "@/lib/utils";
import { primaryAction, type MemberPerspective } from "../../nav";
import { MEMBER_LIFE } from "../instant";
import { signInHref } from "@/lib/redirects";

export async function Greeting({
  perspective,
}: {
  perspective: MemberPerspective;
}) {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const [session, dict, locale] = await Promise.all([
    perspectiveViewerSession(perspective),
    getDictionary(),
    getLocale(),
  ]);
  const { guest, home, action } = dict.member;

  const heading = session
    ? formatMessage(
        home.greeting,
        { name: firstName(session.user.name) },
        locale,
      )
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
