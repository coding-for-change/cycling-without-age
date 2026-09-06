import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Building2, Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PersonAvatar } from "@/components/person-avatar";
import { BackLink, DetailSection } from "../../../_components/detail-page";
import { activity } from "@/lib/activity";
import { membership } from "@/features/membership";
import { profile } from "@/features/profile";
import type { ChapterRole } from "@/lib/access";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import { formatDate, resolveLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { fill } from "@/lib/utils";
import { SidePanel } from "../../../_components/side-panel";
import { readActiveScope } from "../../../active-scope";
import { DeleteUserDialog } from "../../_components/delete-user-dialog";
import { MemberActions } from "../../_components/member-actions";
import { ActivityFeed } from "./activity-feed";

export async function PersonBody({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ session, scope, scopeQuery, chapters, chapterIds }, { userId }] =
    await Promise.all([readActiveScope(searchParams), params]);

  const [person, memberships, applications, events, dict, head] =
    await Promise.all([
      profile.getProfile(userId),
      membership.listMembershipsOfUser(userId),
      membership.listApplicationsOfUser(userId),
      activity.listForUser(userId, {
        chapterIds,
        includeGlobal: scope.canSeeGlobalEvents,
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
  const words = await getLocale();
  const chapterNames = new Map(chapters.map((c) => [c.id, c.name]));
  const roleLabel = (role: ChapterRole) =>
    role === "admin" ? dict.admin.roles.chapterAdmin : dict.admin.roles[role];

  const backHref = `/admin/members${scopeQuery}`;

  const name = person.name || person.email;
  const isSelf = userId === session.user.id;

  return (
    <>
      <BackLink
        href={backHref}
        label={dict.admin.person.back}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-x-12">
        <header className="flex flex-wrap items-center gap-4">
          <PersonAvatar
            svg={avatarSvg(avatarSeed(person.email), true)}
            className="size-12"
          />
          <div className="grid gap-1">
            <h1 className="text-xl tracking-tight md:text-2xl">{name}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-2sm text-ink-soft">
              <span className="inline-flex items-center gap-2">
                <Mail
                  aria-hidden
                  className="size-4"
                />
                {person.email || dict.admin.person.noEmail}
              </span>
              <span className="inline-flex items-center gap-2">
                <Phone
                  aria-hidden
                  className="size-4"
                />
                {person.phoneNumber || dict.admin.person.noPhone}
              </span>
            </div>
          </div>
        </header>

        <aside className="grid content-start gap-3 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <SidePanel title={dict.admin.person.roles}>
            {inScope.length > 0 ? (
              <ul className="grid gap-4">
                {inScope.map((entry) => (
                  <li
                    key={entry.chapterId}
                    className="grid gap-2"
                  >
                    <span className="inline-flex items-center gap-2 text-2sm font-medium">
                      <Building2
                        aria-hidden
                        className="size-4 shrink-0 text-ink-soft"
                      />
                      {chapterNames.get(entry.chapterId)}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {entry.roles.map((role) => (
                        <Badge
                          key={role}
                          className="bg-mint-tint font-normal text-ink"
                        >
                          {roleLabel(role)}
                        </Badge>
                      ))}
                    </div>
                    <MemberActions
                      target={{
                        userId,
                        chapterId: entry.chapterId,
                        name,
                        isAdmin: entry.roles.includes("admin"),
                        isSelf,
                      }}
                      labels={dict.admin.members}
                      cancel={dict.admin.chapters.cancel}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-2sm text-ink-soft">
                {dict.admin.person.noRoles}
              </p>
            )}
          </SidePanel>

          {scope.canDeleteAccounts && !isSelf ? (
            <DeleteUserDialog
              userId={userId}
              name={name}
              backHref={backHref}
              labels={dict.admin.person.delete}
              cancel={dict.admin.chapters.cancel}
            />
          ) : null}
        </aside>

        <div className="grid gap-6 lg:col-start-1">
          {open.length > 0 ? (
            <ul className="grid gap-2">
              {open.map((application) => (
                <li
                  key={application.id}
                  className="grid gap-2 rounded-2xl border border-line px-4 py-3 text-2sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-medium">
                      {application.chapter.name}
                    </span>
                    {application.status === "pending" ? (
                      <Badge className="bg-mint font-normal text-ink">
                        {dict.admin.requests.title}
                      </Badge>
                    ) : (
                      <span className="text-ink-soft">
                        {fill(dict.pilot.status.rejectedTitle, {
                          chapter: application.chapter.name,
                        })}
                      </span>
                    )}
                  </div>
                  <span className="text-ink-soft">
                    {fill(dict.pilot.status.appliedOn, {
                      date: formatDate(application.createdAt, notation),
                    })}
                  </span>
                  {application.decisionNote ? (
                    <p className="rounded-xl bg-mint-tint px-3 py-2 whitespace-pre-wrap text-ink">
                      {application.decisionNote}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          <DetailSection title={dict.admin.person.history}>
            <ActivityFeed
              events={events}
              viewerId={session.user.id}
              labels={dict.admin.history}
              empty={dict.admin.person.historyEmpty}
              notation={notation}
              words={words}
            />
          </DetailSection>
        </div>
      </div>
    </>
  );
}
