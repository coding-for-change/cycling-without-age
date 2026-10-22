import Link from "next/link";
import { TrishawIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";

export function BookRideCard({
  title,
  body,
  action,
  href,
  hint,
}: {
  title: string;
  body: string;
  action: string;
  href: string;
  hint?: string;
}) {
  return (
    <section className="flex flex-col gap-5 overflow-hidden rounded-2xl bg-mint-tint p-5">
      <TrishawIllustration className="w-56 max-w-full self-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-4 motion-safe:duration-700" />
      <div className="flex flex-col gap-1.25">
        <h2 className="text-xl tracking-tight">{title}</h2>
        <p className="text-ink-soft">{body}</p>
      </div>
      <div className="flex flex-col gap-3">
        <Button
          asChild
          variant="brand"
          size="hero"
        >
          <Link
            href={href}
            transitionTypes={["push"]}
          >
            {action}
          </Link>
        </Button>
        {hint ? <p className="text-sm text-ink-soft">{hint}</p> : null}
      </div>
    </section>
  );
}
