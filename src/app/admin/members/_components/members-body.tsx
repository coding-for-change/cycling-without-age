import { headers } from "next/headers";
import { EmptyState } from "@/components/empty-state";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import {
  personProfiles,
  photoUrl,
  subjectSlug,
} from "@/features/person-profiles";
import { parseRoles, type ChapterRole } from "@/lib/access";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import { formatDate, formatNumber, resolveLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { AdminPageHeader } from "../../_components/admin-page";
import { ICONS } from "@/components/icons";
import { readActiveScope } from "../../active-scope";
import { InviteDialog } from "./invite-dialog";
import { MembersTable, type MemberRow } from "./members-table";
import { RequestsTable, type RequestRow } from "./requests-table";
import type { AdminSearchParams } from "../../active-scope";

export async function MembersBody({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const { active, scopeQuery, chapters, chapterIds } =
    await readActiveScope(searchParams);

  const [pending, members, riders, dict, head, locale] = await Promise.all([
    membership.listApplications(chapterIds, "pending"),
    membership.listMembersOfChapters(chapterIds),
    passengers.listPassengersOfChapters(chapterIds),
    getDictionary(),
    headers(),
    getLocale(),
  ]);

  const photos = await personProfiles.photoFileIdsOf(
    [...new Set(members.map((member) => member.userId))].map((id) => ({
      kind: "user" as const,
      id,
    })),
  );
  const lookedAfter = new Map<string, number>();
  const ridesThemself = new Set(riders.flatMap((rider) => rider.userId ?? []));
  for (const rider of riders) {
    if (rider.managedByUserId === rider.userId) continue;
    lookedAfter.set(
      rider.managedByUserId,
      (lookedAfter.get(rider.managedByUserId) ?? 0) + 1,
    );
  }

  const notation = resolveLocale(head.get("accept-language"));
  const showChapter = chapters.length > 1;
  const chapterNames = new Map(chapters.map((c) => [c.id, c.name]));
  const roleLabel = (role: ChapterRole) =>
    role === "admin" ? dict.admin.roles.chapterAdmin : dict.admin.roles[role];

  const requests: RequestRow[] = pending.map((application) => ({
    applicationId: application.id,
    userId: application.userId,
    name: application.user.name,
    email: application.user.email,
    phone: application.user.phoneNumber,
    avatar: avatarSvg(avatarSeed(application.user.email)),
    message: application.message,
    chapterName: application.chapter.name,
    applied: formatDate(application.createdAt, notation),
    appliedIso: application.createdAt.toISOString(),
  }));

  const rows: MemberRow[] = members.flatMap((member) => {
    const roles = parseRoles(member.role);
    const caretakerOf = lookedAfter.get(member.userId) ?? 0;
    if (
      caretakerOf === 0 &&
      roles.length > 0 &&
      roles.every((role) => role === "passenger")
    )
      return [];
    return {
      userId: member.userId,
      chapterId: member.organizationId,
      chapterName: chapterNames.get(member.organizationId) ?? "",
      name: member.user.name,
      email: member.user.email,
      phone: member.user.phoneNumber,
      avatar: avatarSvg(avatarSeed(member.user.email)),
      photoUrl: photoUrl(
        photos.get(subjectSlug({ kind: "user", id: member.userId })) ?? null,
      ),
      roles: roles
        .filter(
          (role) =>
            role !== "passenger" ||
            caretakerOf === 0 ||
            ridesThemself.has(member.userId),
        )
        .map(roleLabel),
      isAdmin: roles.includes("admin"),
      caretaker:
        caretakerOf > 0
          ? formatMessage(
              dict.admin.members.caretaker,
              { count: formatNumber(caretakerOf, notation) },
              locale,
            )
          : null,
      since: formatDate(member.createdAt, notation),
      sinceIso: member.createdAt.toISOString(),
    };
  });

  const MembersIcon = ICONS.members;

  return (
    <>
      <AdminPageHeader title={dict.admin.pages.members.title}>
        {active.kind === "chapter" ? (
          <InviteDialog
            chapterId={active.chapter.id}
            chapterName={active.chapter.name}
            roleLabel={dict.admin.members.columns.role}
            labels={dict.admin.members.invite}
            locale={locale}
          />
        ) : null}
      </AdminPageHeader>

      {requests.length > 0 ? (
        <RequestsTable
          rows={requests}
          showChapter={showChapter}
          scopeQuery={scopeQuery}
          labels={dict.admin.requests}
          phoneColumn={dict.admin.members.columns.phone}
          errors={dict.admin.members.errors}
          table={dict.admin.table}
          locale={locale}
          count={formatMessage(
            dict.admin.requests.count,
            { count: formatNumber(requests.length, notation) },
            locale,
          )}
        />
      ) : null}

      <section className="grid gap-3">
        <h2 className="text-lg font-medium">{dict.admin.members.title}</h2>
        {rows.length > 0 ? (
          <MembersTable
            rows={rows}
            showChapter={showChapter}
            scopeQuery={scopeQuery}
            labels={dict.admin.members}
            chapterColumn={dict.admin.requests.columns.chapter}
            table={dict.admin.table}
            locale={locale}
          />
        ) : (
          <EmptyState icon={MembersIcon}>{dict.admin.members.empty}</EmptyState>
        )}
      </section>
    </>
  );
}
