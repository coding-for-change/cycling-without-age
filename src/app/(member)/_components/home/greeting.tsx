import Link from "next/link";
import { cacheLife } from "next/cache";
import { Button } from "@/components/ui/button";
import { perspectiveViewerSession } from "@/lib/auth-guards";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { PERSPECTIVE_HOME, signInHref } from "@/lib/redirects";
import { firstName } from "@/lib/utils";
import { primaryAction, type MemberPerspective } from "../../nav";
import { MEMBER_LIFE } from "../instant";

const VARIANTS = [
  "default",
  "morning",
  "afternoon",
  "evening",
  "night",
] as const;

export async function Greeting({
  perspective,
  hero = false,
}: {
  perspective: MemberPerspective;
  hero?: boolean;
}) {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const [session, dict, locale] = await Promise.all([
    perspectiveViewerSession(perspective),
    getDictionary(),
    getLocale(),
  ]);
  const { guest, home, action } = dict.member;

  if (!session)
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl tracking-tight md:text-3xl">
          {guest.greeting}
        </h1>
        <p className="text-ink-soft">{guest.tagline}</p>
        {hero ? (
          <>
            <Button
              asChild
              variant="brand"
              size="hero"
              className="mt-2 md:hidden"
            >
              <Link href={signInHref(PERSPECTIVE_HOME[perspective])}>
                {guest.hero}
              </Link>
            </Button>
            <p className="text-sm text-ink-soft md:hidden">{guest.heroHint}</p>
          </>
        ) : null}
      </section>
    );

  const name = firstName(session.user.name);

  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-2xl tracking-tight md:text-3xl">
        {VARIANTS.map((variant) => (
          <span
            key={variant}
            data-greeting={variant}
          >
            {formatMessage(home.greeting[variant], { name }, locale)}
          </span>
        ))}
      </h1>
      {hero ? (
        <Button
          asChild
          variant="brand"
          size="hero"
          className="mt-2 md:hidden"
        >
          <Link href={primaryAction(perspective).href}>
            {action[perspective]}
          </Link>
        </Button>
      ) : null}
    </section>
  );
}
