import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { ICONS } from "@/components/icons";
import { PersonAvatar } from "@/components/person-avatar";
import { EmptyState } from "@/components/empty-state";

export type CountryAdminGroup = {
  id: string;
  name: string;
  people: {
    key: string;
    name: string;
    email: string;
    avatar: string;
    pending: boolean;
  }[];
};

export function CountryAdminsOverview({
  groups,
  labels,
}: {
  groups: CountryAdminGroup[];
  labels: {
    noCountryAdmins: string;
    noCountries: string;
    manage: string;
    invitedBadge: string;
  };
}) {
  if (groups.length === 0)
    return <EmptyState icon={ICONS.countries}>{labels.noCountries}</EmptyState>;

  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => (
        <li
          key={group.id}
          className="flex flex-col gap-3 rounded-2xl border border-line p-4"
        >
          <Link
            href="/admin/countries"
            className="group flex items-center gap-2 font-medium"
          >
            <span className="truncate group-hover:underline">{group.name}</span>
            <ArrowRight
              aria-hidden
              className="ml-auto size-4 text-ink-soft"
            />
            <span className="sr-only">{labels.manage}</span>
          </Link>
          {group.people.length === 0 ? (
            <p className="text-2sm text-ink-soft">{labels.noCountryAdmins}</p>
          ) : (
            <ul className="grid gap-2">
              {group.people.map((person) => (
                <li
                  key={person.key}
                  className="flex min-w-0 items-center gap-2 text-2sm"
                >
                  <PersonAvatar
                    svg={person.avatar}
                    size="sm"
                    className={person.pending ? "opacity-60" : undefined}
                  />
                  <span className="grid min-w-0">
                    <span className="truncate">{person.name}</span>
                    <span className="truncate text-xs text-ink-soft">
                      {person.email}
                    </span>
                  </span>
                  {person.pending ? (
                    <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-ink-soft">
                      <Clock
                        aria-hidden
                        className="size-3"
                      />
                      {labels.invitedBadge}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
