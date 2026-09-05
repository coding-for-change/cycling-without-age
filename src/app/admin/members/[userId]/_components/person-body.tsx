import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { activity } from "@/features/activity";
import { membership } from "@/features/membership";
import { profile } from "@/features/profile";
import type { ChapterRole } from "@/lib/access";
import { avatarSvg } from "@/lib/avatar";
import { formatDate, resolveLocale } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { fill } from "@/lib/utils";
import { readActiveScope } from "../../../active-scope";
import { MemberMenu } from "../../_components/member-menu";
import { PersonAvatar } from "@/components/person-avatar";
import { ActivityFeed } from "./activity-feed";

export async function PersonBody({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ session, scope, active, chapters, chapterIds }, { userId }] =
    await Promise.all([readActiveScope(searchParams), params]);

  const [person, memberships, applications, events, dict, head] =
    await Promise.all([
      profile.getProfile(userId),
      membership.listMembershipsOfUser(userId),
      membership.listApplicationsOfUser(userId),
      activity.listForUser(userId, {
        chapterIds,
        includeGlobal: scope.global,
      }),
      getDictionary(),
      headers(),
    ]);

  const inScope = memberships.filter((m) => chapterIds.includes(m.chapterId));
  const inScopeApplications = applications.filter((a) =>
    chapterIds.includes(a.chapterId),
  );
  if (!person || (inScope.length === 0 && inScopeApplications.length === 0))
    notFound();

  const open = inScopeApplications.filter((a) => a.status !== "approved");

  const notation = resolveLocale(head.get("accept-language"));
  const chapterNames = new Map(chapters.map((c) => [c.id, c.name]));
  const roleLabel = (role: ChapterRole) =>
    role === "admin" ? dict.admin.roles.chapterAdmin : dict.admin.roles[role];

  const scopeQuery =
    active.kind === "chapter"
      ? `?chapter=${encodeURIComponent(active.chapter.slug)}`
      : active.kind === "country"
        ? `?country=${encodeURIComponent(active.country.code)}`
        : "";

  const name = person.name || person.email;

  return (
    <>
      <Link
        href={`/admin/members${scopeQuery}`}
        className="inline-flex min-h-11 w-fit items-center gap-2 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft
          aria-hidden
          className="size-4"
        />
        {dict.admin.person.back}
      </Link>

      <header className="flex flex-wrap items-center gap-4">
        <PersonAvatar
          svg={avatarSvg(userId, true)}
          className="size-16"
        />
        <div className="grid gap-1">
          <h1 className="text-2xl tracking-tight md:text-3xl">{name}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <Mail
                aria-hidden
                className="size-4"
              />
              {person.email || dict.admin.person.noEmail}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Phone
                aria-hidden
                className="size-4"
              />
              {person.phoneNumber || dict.admin.person.noPhone}
            </span>
          </div>
        </div>
      </header>

      <section className="grid gap-3">
        <h2 className="text-lg font-medium">{dict.admin.person.roles}</h2>
        {inScope.length > 0 ? (
          <ul className="grid gap-2">
            {inScope.map((entry) => (
              <li
                key={entry.chapterId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3"
              >
                <div className="grid gap-1.5">
                  <span className="font-medium">
                    {chapterNames.get(entry.chapterId)}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.roles.map((role) => (
                      <Badge
                        key={role}
                        className="bg-mint-tint font-normal text-ink"
                      >
                        {roleLabel(role)}
                      </Badge>
                    ))}
                  </div>
                </div>
                <MemberMenu
                  target={{
                    userId,
                    chapterId: entry.chapterId,
                    name,
                    isAdmin: entry.roles.includes("admin"),
                    isSelf: userId === session.user.id,
                  }}
                  labels={dict.admin.members}
                  cancel={dict.admin.chapters.cancel}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">{dict.admin.person.noRoles}</p>
        )}
      </section>

      {open.length > 0 ? (
        <ul className="grid gap-2">
          {open.map((application) => (
            <li
              key={application.id}
              className="grid gap-2 rounded-2xl border border-line px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-medium">{application.chapter.name}</span>
                {application.status === "pending" ? (
                  <Badge className="bg-mint font-normal text-ink">
                    {dict.admin.requests.title}
                  </Badge>
                ) : (
                  <span className="text-sm text-ink-soft">
                    {fill(dict.pilot.status.rejectedTitle, {
                      chapter: application.chapter.name,
                    })}
                  </span>
                )}
              </div>
              <span className="text-sm text-ink-soft">
                {fill(dict.pilot.status.appliedOn, {
                  date: formatDate(application.createdAt, notation),
                })}
              </span>
              {application.decisionNote ? (
                <p className="rounded-xl bg-mint-tint px-3 py-2 text-sm whitespace-pre-wrap text-ink">
                  {application.decisionNote}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <section className="grid gap-3">
        <h2 className="text-lg font-medium">{dict.admin.person.history}</h2>
        <ActivityFeed
          events={events}
          viewerId={session.user.id}
          labels={dict.admin.history}
          empty={dict.admin.person.historyEmpty}
          notation={notation}
        />
      </section>
    </>
  );
}
