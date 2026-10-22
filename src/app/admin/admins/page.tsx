import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { admins } from "@/features/admins";
import { chapters } from "@/features/chapters";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import { requireSuperAdmin } from "@/lib/auth-guards";
import { formatDate, resolveLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { AdminPageHeader, AdminPageShell } from "../_components/admin-page";
import { PageHeaderSkeleton } from "../_components/admin-skeletons";
import {
  AdminsSectionSkeleton,
  INVITE_BUTTON,
} from "./_components/admins-skeleton";
import {
  CountryAdminsOverview,
  type CountryAdminGroup,
} from "./_components/country-admins-overview";
import { InviteSuperadminDrawer } from "./_components/invite-superadmin-drawer";
import {
  SuperadminsTable,
  type SuperadminRow,
} from "./_components/superadmins-table";

export default function AdminsPage() {
  return (
    <AdminPageShell>
      <Suspense fallback={<PageHeaderSkeleton actions={[INVITE_BUTTON]} />}>
        <AdminsHeader />
      </Suspense>
      <Suspense fallback={<AdminsSectionSkeleton />}>
        <Superadmins />
      </Suspense>
      <Suspense fallback={<AdminsSectionSkeleton />}>
        <CountryAdmins />
      </Suspense>
    </AdminPageShell>
  );
}

async function AdminsHeader() {
  await requireSuperAdmin();
  const dict = await getDictionary();

  return (
    <AdminPageHeader title={dict.admin.pages.admins.title}>
      <Button
        asChild
        variant="brand"
        className="min-h-11"
      >
        <Link
          href="/admin/admins?new=1"
          scroll={false}
        >
          <UserPlus aria-hidden />
          {dict.admin.admins.invite}
        </Link>
      </Button>
    </AdminPageHeader>
  );
}

function Section({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4">
      <div className="grid gap-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-ink-soft">{body}</p>
      </div>
      {children}
    </section>
  );
}

async function notationLocale() {
  return resolveLocale((await headers()).get("accept-language"));
}

async function Superadmins() {
  const session = await requireSuperAdmin();
  const [dict, language, notation, active, pending] = await Promise.all([
    getDictionary(),
    getLocale(),
    notationLocale(),
    admins.listSuperadmins(),
    admins.listPendingSuperadminInvites(),
  ]);
  const strings = dict.admin.admins;
  const date = (value: Date | null) =>
    value ? formatDate(value, notation) : strings.unknown;

  const rows: SuperadminRow[] = [
    ...active.map((person): SuperadminRow => ({
      id: person.userId,
      state: "active",
      userId: person.userId,
      name: person.name || person.email,
      email: person.email,
      avatar: avatarSvg(avatarSeed(person.email)),
      since: date(person.since),
      sinceIso: person.since?.toISOString() ?? "",
      invitedBy: person.invitedByName ?? strings.unknown,
      hasPasskey: person.hasPasskey,
      status: strings.status.active,
      isSelf: person.userId === session.user.id,
    })),
    ...pending.map((invite): SuperadminRow => ({
      id: invite.id,
      state: "pending",
      userId: invite.userId,
      name: invite.user.name || invite.user.email,
      email: invite.user.email,
      avatar: avatarSvg(avatarSeed(invite.user.email)),
      since: strings.unknown,
      sinceIso: "",
      invitedBy: invite.invitedBy?.name ?? strings.unknown,
      hasPasskey: false,
      status: formatMessage(
        strings.status.pending,
        { date: date(invite.expiresAt) },
        language,
      ),
      isSelf: false,
    })),
  ];

  return (
    <Section
      title={strings.superadmins}
      body={strings.superadminsBody}
    >
      <SuperadminsTable
        rows={rows}
        locale={language}
        table={dict.admin.table}
        labels={{
          columns: strings.columns,
          passkey: strings.passkey,
          you: strings.you,
          cancel: strings.cancel,
          revoke: strings.revoke,
          revokeLabel: strings.revokeLabel,
          revokeTitle: strings.revokeTitle,
          revokeBody: strings.revokeBody,
          revoked: strings.revoked,
          lastSuperadmin: strings.lastSuperadmin,
          remove: strings.remove,
          errors: strings.errors,
        }}
      />
      <InviteSuperadminDrawer
        locale={language}
        labels={{
          invite: strings.invite,
          inviteBody: strings.inviteBody,
          fields: strings.fields,
          namePlaceholder: strings.namePlaceholder,
          emailPlaceholder: strings.emailPlaceholder,
          send: strings.send,
          cancel: strings.cancel,
          invited: strings.invited,
          errors: strings.errors,
        }}
      />
    </Section>
  );
}

async function CountryAdmins() {
  await requireSuperAdmin();
  const [dict, countries] = await Promise.all([
    getDictionary(),
    chapters.listCountries(),
  ]);
  const countryIds = countries.map((country) => country.id);
  const [appointed, pending] = await Promise.all([
    chapters.listAdminsByCountry(countryIds),
    admins.listPendingCountryAdminInvites(countryIds),
  ]);
  const strings = dict.admin.admins;

  const groups: CountryAdminGroup[] = countries.map((country) => ({
    id: country.id,
    name: country.name,
    people: [
      ...(appointed.get(country.id) ?? []).map((admin) => ({
        key: `admin:${admin.userId}`,
        name: admin.name || admin.email,
        email: admin.email,
        avatar: avatarSvg(avatarSeed(admin.email)),
        pending: false,
      })),
      ...pending
        .filter((invite) => invite.countryId === country.id)
        .map((invite) => ({
          key: `invite:${invite.id}`,
          name: invite.user.name || invite.user.email,
          email: invite.user.email,
          avatar: avatarSvg(avatarSeed(invite.user.email)),
          pending: true,
        })),
    ],
  }));

  return (
    <Section
      title={strings.countryAdmins}
      body={strings.countryAdminsBody}
    >
      <CountryAdminsOverview
        groups={groups}
        labels={{
          noCountryAdmins: strings.noCountryAdmins,
          noCountries: strings.noCountries,
          manage: strings.manage,
          invitedBadge: strings.invitedBadge,
        }}
      />
    </Section>
  );
}
