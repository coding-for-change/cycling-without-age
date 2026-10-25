import { cacheLife } from "next/cache";
import { perspectiveViewerSession } from "@/lib/auth-guards";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { firstName } from "@/lib/utils";
import type { MemberPerspective } from "../../nav";
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
  const { guest, home } = dict.member;

  if (!session)
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl tracking-tight md:text-3xl">
          {guest.greeting}
        </h1>
        <p className="text-ink-soft">{guest.tagline}</p>
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
    </section>
  );
}
