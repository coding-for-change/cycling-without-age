import Link from "next/link";
import { BenchIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n";
import { signInHref } from "@/lib/redirects";

export type GuestLockedPage = "rides" | "calendar" | "chat";

const PATHS: Record<GuestLockedPage, string> = {
  rides: "/passenger/rides",
  calendar: "/passenger/calendar",
  chat: "/passenger/chat",
};

export async function GuestLocked({ page }: { page: GuestLockedPage }) {
  const dict = await getDictionary();
  const strings = dict.member.guestLocked;

  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <BenchIllustration className="w-48" />
      <h1 className="text-xl tracking-tight">{strings.title}</h1>
      <p className="max-w-sm text-ink-soft">{strings[page]}</p>
      <Button
        asChild
        variant="brand"
        className="mt-2 min-h-12 rounded-full px-6 text-base"
      >
        <Link href={signInHref(PATHS[page])}>{strings.cta}</Link>
      </Button>
    </section>
  );
}
