import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Building2, Mail, MapPin, Phone } from "lucide-react";
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
  DetailList,
  DetailListRow,
  DetailMeta,
  DetailNotice,
  DetailSection,
  MetaBadge,
} from "../../../_components/detail-page";
import { ActivityFeed } from "../../../_components/activity-feed";
import { withHandOverNames } from "../../../_components/hand-over-names";
import { deletionConsequences } from "../../../_components/deletion-consequences";
import { TimelineBubble } from "../../../_components/timeline";
import { activity } from "@/lib/activity";
import { accounts } from "@/features/accounts";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import { rides } from "@/features/rides";
import { chapters as chapterFeature } from "@/features/chapters";
import { personProfiles, photoUrl } from "@/features/person-profiles";
import { ProfileView } from "@/features/person-profiles/components/profile-view";
import { accessPerson, seesHealthDetails } from "@/use-cases/person-access";
import { memberTrainingPanel } from "@/use-cases/training-progress";
import type { ChapterRole } from "@/lib/access";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import { isPhoneTempEmail } from "@/lib/identity";
import { resolveLocale } from "@/lib/format";
import { formatInstantDate } from "@/lib/instant-date";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { FALLBACK_TIME_ZONE } from "@/lib/time-zone";
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
import { LinkCarer } from "./link-carer";
import { PilotTraining } from "./pilot-training";
import { pilotTrainingProps } from "./pilot-training-props";
import { MemberOverviewStrip } from "./member-overview-strip";
import { memberOverviewProps } from "./member-overview-props";
import { pickupLabel } from "../../../passengers/_components/pickup-label";
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

  const [
    person,
    memberships,
    applications,
    events,
    dict,
    head,
    managedRows,
    helper,
    rideStats,
    ownRider,
  ] = await Promise.all([
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
    passengers.listPassengersManagedBy(userId),
    accounts.getHelperDetails(userId),
    rides.volunteerRideStats(userId, chapterIds),
    passengers.getOwnPassenger(userId),
  ]);

  const inScope = memberships.filter((m) => chapterIds.includes(m.chapterId));
  const inScopeApplications = applications.filter((a) =>
    chapterIds.includes(a.chapterId),
  );
  if (!person || (inScope.length === 0 && inScopeApplications.length === 0))
    notFound();

  const open = inScopeApplications.filter((a) => a.status !== "approved");

  const lookedAfter = managedRows.filter((rider) => rider.userId !== userId);
  const goneWith = lookedAfter.filter((rider) => !rider.userId);
  const visibleRiders = lookedAfter.filter((rider) =>
    chapterIds.includes(rider.chapterId),
  );
  const showCaretaker = visibleRiders.length > 0;

  const linkable =
    ownRider &&
    ownRider.managedByUserId === userId &&
    chapterIds.includes(ownRider.chapterId)
      ? ownRider
      : null;
  const [carerCandidates, carerLinks] = linkable
    ? await Promise.all([
        membership.listMembersOfChapters([linkable.chapterId]),
        passengers.listPendingCareLinks(linkable.id),
      ])
    : [[], []];

  const isPilot = memberships.some((m) => m.roles.includes("pilot"));
  const piloting = isPilot || applications.some((a) => a.status === "pending");
  const words = await getLocale();
  const [access, ownProfile, trainingPanel] = await Promise.all([
    accessPerson(session, { kind: "user", id: userId }),
    personProfiles.getProfile({ kind: "user", id: userId }),
    piloting ? memberTrainingPanel(userId, session.access, words) : null,
  ]);

  const notation = resolveLocale(head.get("accept-language"));
  const training = trainingPanel
    ? await pilotTrainingProps({
        panel: trainingPanel,
        dict,
        notation,
        words,
      })
    : null;
  const timeZone =
    training?.timeZone ??
    (
      await chapterFeature.getChapterTimeZones(
        inScope.slice(0, 1).map((entry) => entry.chapterId),
      )
    )[0]?.timeZone ??
    FALLBACK_TIME_ZONE;
  const overview = memberOverviewProps({
    dict,
    notation,
    words,
    timeZone,
    now: new Date(),
    training: training
      ? {
          trainingRequired: training.trainingRequired,
          chapters: training.chapters,
          inPerson: training.inPerson,
          courses: training.courses,
          readyLabels: {
            ready: training.labels.ready,
            notReady: training.labels.notReady,
          },
        }
      : null,
    rides: rideStats,
  });
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
                photoUrl={access ? photoUrl(ownProfile.photoFileId) : null}
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
                        lookedAfter: goneWith.length,
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
                    input={{
                      userId,
                      removeRiders: goneWith.map((rider) => rider.id),
                    }}
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
          <>
            <SidePanel title={dict.admin.person.roles}>
              {inScope.length > 0 ? (
                <ul className="grid gap-4">
                  {inScope.map((entry) => (
                    <li
                      key={entry.chapterId}
                      className="grid gap-2"
                    >
                      <span className="flex min-w-0 items-start gap-2 text-2sm font-medium">
                        <Building2
                          aria-hidden
                          className="mt-0.5 size-4 shrink-0 text-ink-soft"
                        />
                        <span className="min-w-0 break-words">
                          {chapterNames.get(entry.chapterId)}
                        </span>
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
                        removedHref={backHref}
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
            {linkable ? (
              <SidePanel title={dict.admin.person.carer.title}>
                <div className="grid gap-3 text-2sm">
                  {carerLinks.length ? (
                    <ul className="grid gap-1.25">
                      {carerLinks.map((link) => (
                        <li
                          key={link.id}
                          className="text-ink-soft"
                        >
                          {formatMessage(
                            dict.admin.person.carer.pending,
                            {
                              name: link.caretaker.name || link.caretaker.email,
                            },
                            words,
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-ink-soft">
                      {dict.admin.person.carer.none}
                    </p>
                  )}
                  <LinkCarer
                    passengerId={linkable.id}
                    rider={`${linkable.firstName} ${linkable.lastName}`.trim()}
                    chapter={chapterNames.get(linkable.chapterId) ?? ""}
                    members={carerCandidates
                      .filter((member) => member.userId !== userId)
                      .map((member) => ({
                        id: member.userId,
                        name: member.user.name || member.user.email,
                        avatar: avatarSvg(avatarSeed(member.user.email)),
                        hint: isPhoneTempEmail(member.user.email)
                          ? (member.user.phoneNumber ?? undefined)
                          : member.user.email,
                      }))}
                    strings={{
                      ...dict.admin.person.carer,
                      picker: dict.admin.passengers.handOver.picker,
                    }}
                    errors={
                      Object.fromEntries(
                        Object.entries({
                          ...dict.common.errors,
                          ...dict.admin.passengers.handOver.errors,
                          ...dict.admin.person.carer.errors,
                        }).map(([key, template]) => [
                          key,
                          formatMessage(
                            template,
                            {
                              rider:
                                `${linkable.firstName} ${linkable.lastName}`.trim(),
                            },
                            words,
                          ),
                        ]),
                      ) as Record<string, string> & { generic: string }
                    }
                    language={words}
                  />
                </div>
              </SidePanel>
            ) : null}
          </>
        }
      >
        <MemberOverviewStrip view={overview} />

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
                    {
                      date: formatInstantDate(
                        application.createdAt,
                        notation,
                        application.chapter.timeZone,
                      ),
                    },
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

        {training ? (
          <DetailSection title={dict.admin.members.training.title}>
            <PilotTraining
              userId={userId}
              trainingRequired={training.trainingRequired}
              inPerson={training.inPerson}
              blanket={training.blanket}
              courses={training.courses}
              labels={training.labels}
              locale={words}
            />
          </DetailSection>
        ) : null}

        {showCaretaker ? (
          <DetailSection
            title={dict.admin.person.caretaker.title}
            description={
              helper?.helperRelationship
                ? formatMessage(
                    dict.admin.person.caretaker.relationship,
                    {
                      relationship: relationshipLabel(
                        helper.helperRelationship,
                        dict.riders.relationship.options,
                      ),
                    },
                    words,
                  )
                : undefined
            }
            meta={visibleRiders.length > 0 ? visibleRiders.length : undefined}
          >
            {scope.canDeleteAccounts &&
            !isSelf &&
            visibleRiders.some((rider) => !rider.userId) ? (
              <DetailNotice>
                {dict.admin.person.caretaker.handOverHint}
              </DetailNotice>
            ) : null}
            <DetailList>
              {visibleRiders.map((rider) => {
                const pickup = pickupLabel(rider, dict.riders.pickup.careHome);
                return (
                  <DetailListRow
                    key={rider.id}
                    href={`/admin/passengers/${rider.id}${scopeQuery}`}
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {`${rider.firstName} ${rider.lastName}`.trim()}
                    </span>
                    {pickup ? (
                      <span className="inline-flex min-w-0 items-center gap-1 text-ink-soft">
                        {rider.residence === "careHome" ? (
                          <Building2
                            aria-hidden
                            className="size-3.5 shrink-0"
                          />
                        ) : (
                          <MapPin
                            aria-hidden
                            className="size-3.5 shrink-0"
                          />
                        )}
                        <span className="truncate">{pickup}</span>
                      </span>
                    ) : null}
                  </DetailListRow>
                );
              })}
            </DetailList>
          </DetailSection>
        ) : null}

        {access ? (
          <DetailSection title={dict.admin.person.profile}>
            <ProfileView
              name={name}
              avatar=""
              profile={personProfiles.toPublicProfile(
                ownProfile,
                access.target.birthDate,
              )}
              showAccessibility={seesHealthDetails(
                session,
                access.relation,
                access.target,
              )}
              strings={dict.personProfile}
              language={words}
              hero={false}
            />
          </DetailSection>
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
            events={await withHandOverNames(events.slice(0, shown))}
            viewerId={session.user.id}
            labels={dict.admin.history}
            empty={dict.admin.person.historyEmpty}
            notation={notation}
            words={words}
            timeZone={timeZone}
          />
        </HistorySection>
      </DetailLayout>
    </>
  );
}

const relationshipLabel = (value: string, options: Record<string, string>) =>
  options[value] ?? value;
