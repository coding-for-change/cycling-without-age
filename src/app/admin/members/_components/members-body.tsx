import { headers } from "next/headers";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { membership } from "@/features/membership";
import { parseRoles, type ChapterRole } from "@/lib/access";
import { avatarSvg } from "@/lib/avatar";
import { formatDate, formatNumber, resolveLocale } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { fill } from "@/lib/utils";
import { AdminPageHeader } from "../../_components/admin-page";
import { ICONS } from "../../_components/icons";
import { readActiveScope } from "../../active-scope";
import { InviteDialog } from "./invite-dialog";
import { MembersTable, type MemberRow } from "./members-table";
import { RequestsTable, type RequestRow } from "./requests-table";

export async function MembersBody({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { active, chapters, chapterIds } = await readActiveScope(searchParams);

  const [pending, members, dict, head] = await Promise.all([
    membership.listApplications(chapterIds, "pending"),
    membership.listMembersOfChapters(chapterIds),
    getDictionary(),
    headers(),
  ]);

  const notation = resolveLocale(head.get("accept-language"));
  const showChapter = chapters.length > 1;
  const chapterNames = new Map(chapters.map((c) => [c.id, c.name]));
  const roleLabel = (role: ChapterRole) =>
    role === "admin" ? dict.admin.roles.chapterAdmin : dict.admin.roles[role];

  const scopeQuery =
    active.kind === "chapter"
      ? `?chapter=${encodeURIComponent(active.chapter.slug)}`
      : active.kind === "country"
        ? `?country=${encodeURIComponent(active.country.code)}`
        : "";

  const requests: RequestRow[] = pending.map((application) => ({
    applicationId: application.id,
    userId: application.userId,
    name: application.user.name,
    email: application.user.email,
    phone: application.user.phoneNumber,
    avatar: avatarSvg(application.userId),
    message: application.message,
    chapterName: application.chapter.name,
    applied: formatDate(application.createdAt, notation),
    appliedIso: application.createdAt.toISOString(),
  }));

  const rows: MemberRow[] = members.flatMap((member) => {
    const roles = parseRoles(member.role);
    if (roles.length > 0 && roles.every((role) => role === "passenger"))
      return [];
    return {
      userId: member.userId,
      chapterId: member.organizationId,
      chapterName: chapterNames.get(member.organizationId) ?? "",
      name: member.user.name,
      email: member.user.email,
      phone: member.user.phoneNumber,
      avatar: avatarSvg(member.userId),
      roles: roles.map(roleLabel),
      isAdmin: roles.includes("admin"),
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
          count={fill(dict.admin.requests.count, {
            count: formatNumber(requests.length, notation),
          })}
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
          />
        ) : (
          <Empty className="rounded-2xl border border-line">
            <EmptyHeader>
              <EmptyMedia
                variant="icon"
                className="bg-mint-tint text-ink"
              >
                <MembersIcon />
              </EmptyMedia>
              <EmptyDescription className="text-ink-soft">
                {dict.admin.members.empty}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>
    </>
  );
}
