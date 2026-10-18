import Link from "next/link";
import { Button } from "@/components/ui/button";
import { perspectiveViewerSession } from "@/lib/auth-guards";
import { cacheLife } from "next/cache";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { PERSPECTIVE_HOME } from "@/lib/redirects";
import { cn, firstName } from "@/lib/utils";
import { primaryAction, type MemberPerspective } from "../../nav";
import { MEMBER_LIFE } from "../instant";
import { signInHref } from "@/lib/redirects";
import { getPassengerAudience } from "@/use-cases/passenger-audience";
import { audienceCopy } from "../audience-copy";

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
  const audience =
    session && perspective === "passenger"
      ? await getPassengerAudience(session.user.id)
      : null;

  const heading = session
    ? formatMessage(
        home.greeting,
        { name: firstName(session.user.name) },
        locale,
      )
    : guest.greeting;
  const tagline = session
    ? audienceCopy(
        audience,
        home[perspective].tagline,
        home.passenger.caretakerTagline,
        locale,
      )
    : guest.tagline;
  const hero = session
    ? { href: primaryAction(perspective).href, label: action[perspective] }
    : {
        href: signInHref(PERSPECTIVE_HOME[perspective]),
        label: guest.hero,
      };

  return (
    <section className="flex flex-col gap-3">
      {/* A passenger's phone greets in the top bar (mockup 2); the h1 stays for
          screen readers and the desktop. */}
      <h1
        className={cn(
          "text-2xl tracking-tight md:text-3xl",
          session && perspective === "passenger" && "max-md:sr-only",
        )}
      >
        {heading}
      </h1>
      <p
        className={cn(
          "text-ink-soft",
          session && perspective === "passenger" && "max-md:hidden",
        )}
      >
        {tagline}
      </p>
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
