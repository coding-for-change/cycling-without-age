import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Building2, Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { PersonAvatar } from "@/components/person-avatar";
import {
  BackLink,
  DETAIL_MEDIA,
  DETAIL_TITLE,
  DetailEmpty,
  DetailHeader,
  DetailHeaderActions,
  DetailLayout,
  DetailMeta,
  MetaBadge,
} from "../../../_components/detail-page";
import { ActivityFeed } from "../../../_components/activity-feed";
import { deletionConsequences } from "../../../_components/deletion-consequences";
import { TimelineBubble } from "../../../_components/timeline";
import { activity } from "@/lib/activity";
import { membership } from "@/features/membership";
import { profile } from "@/features/profile";
import type { ChapterRole } from "@/lib/access";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import { formatDate, resolveLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import { historyShown } from "../../../_components/history-more";
import {
  HistorySection,
  historyTake,
} from "../../../_components/history-section";
import { SidePanel } from "../../../_components/side-panel";
import { readActiveScope } from "../../../active-scope";
import { MemberActions } from "../../_components/member-actions";
import { deleteUserAction } from "../../actions";
import type { AdminSearchParams } from "../../../active-scope";

export async function PersonBody({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  const [
    { session, scope, scopeQuery, chapters, chapterIds },
    { userId },
    query,
  ] = await Promise.all([readActiveScope(searchParams), params, searchParams]);
  const shown = historyShown(query);

  const [person, memberships, applications, events, dict, head] =
    await Promise.all([
      profile.getProfile(userId),
      membership.listMembershipsOfUser(userId),
      membership.listApplicationsOfUser(userId),
      activity.listForUser(userId, {
        chapterIds,
        includeGlobal: scope.canSeeGlobalEvents,
        take: historyTake(shown),
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

      <DetailLayout
        header={
          <DetailHeader
            media={
              <PersonAvatar
                svg={avatarSvg(avatarSeed(person.email), true)}
                className={cn(DETAIL_MEDIA, "rounded-full")}
              />
            }
            title={<span className={DETAIL_TITLE}>{name}</span>}
            aside={
              scope.canDeleteAccounts && !isSelf ? (
                <DetailHeaderActions>
                  <ConfirmDeleteDialog
                    variant="icon"
                    name={name}
                    consequences={deletionConsequences(
                      {
                        roles: memberships.length,
                        pending: applications.filter(
                          (a) => a.status !== "approved",
                        ).length,
                      },
                      dict.admin.deletion,
                      words,
                    )}
                    labels={{
                      ...dict.admin.person.delete,
                      consequences: dict.admin.deletion.consequences,
                    }}
                    locale={words}
                    cancel={dict.admin.chapters.cancel}
                    action={deleteUserAction}
                    input={{ userId }}
                    redirectTo={backHref}
                  />
                </DetailHeaderActions>
              ) : undefined
            }
          >
            <DetailMeta className="gap-x-4">
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
            </DetailMeta>
          </DetailHeader>
        }
        sidebar={
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
                        <MetaBadge key={role}>{roleLabel(role)}</MetaBadge>
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
                      locale={words}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <DetailEmpty variant="panel">
                {dict.admin.person.noRoles}
              </DetailEmpty>
            )}
          </SidePanel>
        }
      >
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
                      {formatMessage(
                        dict.pilot.status.rejectedTitle,
                        { chapter: application.chapter.name },
                        words,
                      )}
                    </span>
                  )}
                </div>
                <span className="text-ink-soft">
                  {formatMessage(
                    dict.pilot.status.appliedOn,
                    { date: formatDate(application.createdAt, notation) },
                    words,
                  )}
                </span>
                {application.decisionNote ? (
                  <TimelineBubble>{application.decisionNote}</TimelineBubble>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        <HistorySection
          title={dict.admin.person.history}
          pathname={`/admin/members/${userId}`}
          query={query}
          shown={shown}
          total={events.length}
          showMoreLabel={dict.admin.history.showMore}
        >
          <ActivityFeed
            events={events.slice(0, shown)}
            viewerId={session.user.id}
            labels={dict.admin.history}
            empty={dict.admin.person.historyEmpty}
            notation={notation}
            words={words}
          />
        </HistorySection>
      </DetailLayout>
    </>
  );
}
