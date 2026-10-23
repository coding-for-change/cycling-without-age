import { PartyPopper } from "lucide-react";
import { FileImage } from "@/features/fleet/components/file-image";
import { EventPhotoTransition } from "@/features/rides/components/event-photo-transition";

export function EventHero({
  rideId,
  title,
  photos,
}: {
  rideId: string;
  title: string;
  photos: { fileId: string }[];
}) {
  const [hero, ...more] = photos;
  if (!hero)
    return (
      <div
        aria-hidden
        className="flex aspect-3/1 items-center justify-center rounded-2xl bg-mint-tint text-mint-ink"
      >
        <PartyPopper className="size-10" />
      </div>
    );

  return (
    <div className="-mx-4 -mt-2 flex snap-x snap-mandatory gap-1.25 overflow-x-auto lg:mx-0 lg:mt-0">
      <EventPhotoTransition rideId={rideId}>
        <FileImage
          fileId={hero.fileId}
          alt={title}
          loading="eager"
          className="aspect-4/3 w-full shrink-0 snap-center lg:rounded-2xl"
        />
      </EventPhotoTransition>
      {more.map((photo) => (
        <FileImage
          key={photo.fileId}
          fileId={photo.fileId}
          alt={title}
          className="aspect-4/3 w-full shrink-0 snap-center lg:rounded-2xl"
        />
      ))}
    </div>
  );
}
