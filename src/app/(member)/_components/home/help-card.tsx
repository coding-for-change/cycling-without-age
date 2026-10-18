import Link from "next/link";
import { cacheLife } from "next/cache";
import { MessageCircle, Phone } from "lucide-react";
import { chapters } from "@/features/chapters";
import { perspectiveViewerSession } from "@/lib/auth-guards";
import { getDictionary } from "@/lib/i18n";
import { getMemberHome } from "@/use-cases/member-home";
import { MEMBER_LIFE } from "../instant";

const pill =
  "flex min-h-14 w-full items-center justify-center gap-2 rounded-full border border-line bg-paper px-5 text-base font-bold shadow-soft outline-none transition-transform hover:bg-canvas-deep focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-98 motion-reduce:transition-none";

/**
 * A person, one tap away (mockup 2): the number each chapter set for its
 * passengers, or — where none has — a message to the chapter.
 */
export async function HelpCard() {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const session = await perspectiveViewerSession("passenger");
  if (!session) return null;
  const [home, dict] = await Promise.all([
    getMemberHome(session.user.id),
    getDictionary(),
  ]);
  if (!home.chapters.length) return null;
  const settings = await Promise.all(
    home.chapters.map((chapter) => chapters.getSettings(chapter.id)),
  );
  const phones = home.chapters.flatMap((chapter, index) => {
    const phone = settings[index].passengerPhone;
    return phone ? [{ chapter: chapter.name, phone }] : [];
  });
  const s = dict.member.home.passenger.help;

  return (
    <section className="reveal flex flex-col gap-4 rounded-soft border border-line bg-paper p-5 shadow-soft [--i:7]">
      <div className="flex items-center gap-3.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-grey-tint">
          <Phone
            aria-hidden
            className="size-5"
          />
        </span>
        <div className="flex min-w-0 flex-col">
          <h2 className="text-lg">{s.title}</h2>
          <p className="text-sm text-ink-soft">
            {phones.length ? s.body : s.bodyWrite}
          </p>
        </div>
      </div>
      {phones.length ? (
        phones.map(({ chapter, phone }) => (
          <a
            key={chapter}
            href={`tel:${phone.replace(/[^\d+]/g, "")}`}
            className={pill}
          >
            <Phone
              aria-hidden
              className="size-5"
            />
            <span className="tabular-nums">{phone}</span>
            {phones.length > 1 ? (
              <span className="truncate text-sm font-normal text-ink-soft">
                {chapter}
              </span>
            ) : null}
          </a>
        ))
      ) : (
        <Link
          href="/passenger/chat?new=1"
          className={pill}
        >
          <MessageCircle
            aria-hidden
            className="size-5"
          />
          {s.write}
        </Link>
      )}
    </section>
  );
}
