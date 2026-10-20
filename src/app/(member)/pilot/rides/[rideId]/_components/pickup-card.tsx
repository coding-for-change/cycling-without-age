import { StorageAccessCard } from "@/features/fleet/components/storage-access-card";
import { storageAccessLabels } from "@/features/fleet/components/strings";
import type { Locale } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { pickupView } from "@/use-cases/finish-ride";

type Places = NonNullable<Awaited<ReturnType<typeof pickupView>>>;

/** Where each trishaw on the ride waits, and how to get in. */
export function PickupCard({
  places,
  dict,
  words,
}: {
  places: Places;
  dict: Dictionary;
  words: Locale;
}) {
  const strings = dict.pilot.rides.detail.pickup;
  const labels = {
    ...storageAccessLabels(dict),
    pool: dict.fleet.common.pool,
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-ink-soft text-xs font-semibold tracking-wide uppercase">
          {strings.title}
        </h2>
        <p className="text-2sm text-ink-soft">{strings.hint}</p>
      </div>
      {places.map(({ trishaw, location }) => (
        <article
          key={trishaw.id}
          className="border-line flex flex-col gap-4 rounded-2xl border p-4"
        >
          <h3 className="text-sm font-semibold">{trishaw.name}</h3>
          {location ? (
            <StorageAccessCard
              location={location}
              pool={location.kind === "pool"}
              withReturn={false}
              labels={labels}
              words={words}
            />
          ) : (
            <p className="text-2sm text-ink-soft">
              {dict.fleet.finish.noLocation}
            </p>
          )}
        </article>
      ))}
    </section>
  );
}
