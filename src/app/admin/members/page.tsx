import { Suspense, type ReactNode } from "react";
import { cacheLife } from "next/cache";
import { getDictionary } from "@/lib/i18n";
import { AdminPageHeader, AdminPageShell } from "../_components/admin-page";
import type { AdminSearchParams } from "../active-scope";
import { ADMIN_LIFE, adminViewer } from "../admin-viewer";
import {
  MemberInvite,
  MemberList,
  MemberRequests,
} from "./_components/members-body";
import { MembersActions } from "./_components/members-header";
import {
  MemberRowsSkeleton,
  MembersHeaderSkeleton,
  MembersSectionSkeleton,
} from "./_components/members-skeleton";

type PageProps = { searchParams: Promise<AdminSearchParams> };

export default function MembersPage({ searchParams }: PageProps) {
  return (
    <AdminPageShell>
      <Suspense fallback={<MembersHeaderSkeleton />}>
        <MembersHeader />
      </Suspense>
      <Suspense fallback={null}>
        <MemberRequests searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<MembersSectionSkeleton />}>
        <MembersSection
          list={
            <Suspense fallback={<MemberRowsSkeleton />}>
              <MemberList searchParams={searchParams} />
            </Suspense>
          }
        />
      </Suspense>
      <Suspense fallback={null}>
        <MemberInvite searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}

async function MembersHeader() {
  "use cache: private";
  cacheLife(ADMIN_LIFE);

  const [viewer, dict] = await Promise.all([adminViewer(), getDictionary()]);

  return (
    <AdminPageHeader title={dict.admin.pages.members.title}>
      <Suspense fallback={null}>
        <MembersActions
          viewer={viewer}
          inviteLabel={dict.admin.members.invite.open}
        />
      </Suspense>
    </AdminPageHeader>
  );
}

async function MembersSection({ list }: { list: ReactNode }) {
  "use cache: private";
  cacheLife(ADMIN_LIFE);

  const dict = await getDictionary();

  return (
    <section className="grid gap-3">
      <h2 className="text-lg font-medium">{dict.admin.members.title}</h2>
      {list}
    </section>
  );
}
