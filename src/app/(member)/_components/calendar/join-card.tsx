import Link from "next/link";
import { ChevronRight, UsersRound } from "lucide-react";
import { FileImage } from "@/features/fleet/components/file-image";
import { EventPhotoTransition } from "@/features/rides/components/event-photo-transition";

export function JoinCard({
  rideId,
  href,
  title,
  time,
  startsAt,
  status,
  photo,
}: {
  rideId: string;
  href: string;
  title: string;
  time: string;
  startsAt: Date;
  status: string;
  photo: string | null;
}) {
  return (
    <li className="relative flex items-center gap-3.5 rounded-2xl border border-line bg-canvas p-3.5 transition-[background-color,scale] has-[a:active]:scale-99 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ink has-[a:hover]:bg-canvas-deep motion-reduce:transition-none">
      {photo ? (
        <EventPhotoTransition rideId={rideId}>
          <div className="size-14 shrink-0 overflow-hidden rounded-xl">
            <FileImage
              fileId={photo}
              alt=""
              className="size-full"
            />
          </div>
        </EventPhotoTransition>
      ) : (
        <span
          aria-hidden
          className="grid size-14 shrink-0 place-items-center rounded-xl border border-dashed border-mint-deep text-mint-ink"
        >
          <UsersRound className="size-5" />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          href={href}
          prefetch={photo ? true : undefined}
          transitionTypes={["push"]}
          aria-label={[title, time, status].join(" · ")}
          className="truncate font-display text-base leading-6 font-semibold outline-none after:absolute after:inset-0 after:rounded-2xl"
        >
          {title}
        </Link>
        <time
          dateTime={startsAt.toISOString()}
          className="text-2sm text-ink-soft tabular-nums"
        >
          {time}
        </time>
        <span className="mt-1 flex w-fit items-center gap-2 rounded-full bg-mint-tint px-2 text-xs leading-5 font-medium text-ink">
          <span
            aria-hidden
            className="size-1.5 rounded-full border border-mint-deep"
          />
          {status}
        </span>
      </div>
      <ChevronRight
        aria-hidden
        className="size-4 shrink-0 text-ink-faint"
      />
    </li>
  );
}
