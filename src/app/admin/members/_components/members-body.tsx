import { cache } from "react";
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
import { avatarSvg, seedOf } from "@/lib/avatar";
import { formatDate, formatNumber, resolveLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { ICONS } from "@/components/icons";
import { readActiveScope } from "../../active-scope";
import { InviteDrawer } from "./invite-dialog";
import { MembersTable, type MemberRow } from "./members-table";
import { RequestsTable, type RequestRow } from "./requests-table";
import type { AdminSearchParams } from "../../active-scope";

type Props = { searchParams: Promise<AdminSearchParams> };

const loadMembers = cache(async (searchParams: Promise<AdminSearchParams>) => {
  const { active, scopeQuery, chapters, chapterIds } = await readActiveScope(
    searchParams,
    "members",
  );

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
    avatar: avatarSvg(seedOf(application.user)),
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
      avatar: avatarSvg(seedOf(member.user)),
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

  return {
    active,
    scopeQuery,
    dict,
    locale,
    notation,
    showChapter,
    requests,
    rows,
  };
});

export async function MemberRequests({ searchParams }: Props) {
  const { requests, showChapter, scopeQuery, dict, locale, notation } =
    await loadMembers(searchParams);
  if (requests.length === 0) return null;

  return (
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
  );
}

export async function MemberList({ searchParams }: Props) {
  const { rows, showChapter, scopeQuery, dict, locale } =
    await loadMembers(searchParams);
  const MembersIcon = ICONS.members;

  if (rows.length === 0)
    return (
      <EmptyState icon={MembersIcon}>{dict.admin.members.empty}</EmptyState>
    );

  return (
    <MembersTable
      rows={rows}
      showChapter={showChapter}
      scopeQuery={scopeQuery}
      labels={dict.admin.members}
      chapterColumn={dict.admin.requests.columns.chapter}
      table={dict.admin.table}
      locale={locale}
    />
  );
}

export async function MemberInvite({ searchParams }: Props) {
  const { active, dict, locale } = await loadMembers(searchParams);
  if (active.kind !== "chapter") return null;

  return (
    <InviteDrawer
      chapterId={active.chapter.id}
      chapterName={active.chapter.name}
      roleLabel={dict.admin.members.columns.role}
      labels={dict.admin.members.invite}
      locale={locale}
    />
  );
}
