import { Suspense } from "react";
import { notFound } from "next/navigation";
import { markdownToolLabels } from "@/components/markdown-editor";
import { fleet } from "@/features/fleet";
import { allowsAdmin, isCountryAdmin, isSuperAdmin } from "@/lib/access";
import { wordsLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { AdminPageShell } from "../../../_components/admin-page";
import { BackLink } from "../../../_components/detail-page";
import { readActiveScope, type AdminSearchParams } from "../../../active-scope";
import { DetailSkeleton } from "../../../_components/detail-skeleton";
import { canSeeType, ownerNameOf, seatOptions } from "../_components/catalogue";
import { TypeDetail } from "./_components/type-detail";

export default function TypePage({
  params,
  searchParams,
}: {
  params: Promise<{ typeId: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<DetailSkeleton />}>
        <TypeBody
          params={params}
          searchParams={searchParams}
        />
      </Suspense>
    </AdminPageShell>
  );
}

async function TypeBody({
  params,
  searchParams,
}: {
  params: Promise<{ typeId: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  const [{ session, scope, scopeQuery }, { typeId }] = await Promise.all([
    readActiveScope(searchParams, "bikes"),
    params,
  ]);

  const type = await fleet.getType(typeId);
  if (!type || !canSeeType(scope, type)) notFound();

  const [authority, dict, language] = await Promise.all([
    fleet.typeAuthority(type.id),
    getDictionary(),
    getLocale(),
  ]);

  const common = dict.fleet.common;
  const strings = dict.fleet.types;
  const detail = strings.detail;
  const words = wordsLocale(language);
  const canManage = allowsAdmin(session.access, authority);

  const target = fleet.promotionTarget(type);
  const targetCountry =
    target?.scope === "country"
      ? scope.countries.find((country) => country.id === target.countryId)
      : undefined;
  const promoteLabel =
    target?.scope === "global"
      ? isSuperAdmin(session.access)
        ? detail.promote.global
        : null
      : target?.scope === "country" &&
          isCountryAdmin(session.access, target.countryId)
        ? formatMessage(
            detail.promote.country,
            { name: targetCountry?.name ?? common.scopes.country },
            words,
          )
        : null;

  const ownerName = ownerNameOf(type);
  const count = type._count.trishaws;
  const backHref = `/admin/trishaws/types${scopeQuery}`;

  return (
    <>
      <BackLink
        href={backHref}
        label={strings.back}
      />
      <TypeDetail
        type={{
          id: type.id,
          name: type.name,
          description: type.description,
          seats: type.seats,
          wheelchair: type.wheelchairAccessible,
          photoFileId: type.photoFileId,
          photoFileIds: type.photos.map((photo) => photo.fileId),
          manualFileId: type.manualFileId,
          archived: type.archivedAt !== null,
          scopeLabel: common.scopes[type.scope],
          ownerName,
          usage: formatMessage(detail.usage, { count }, words),
          inUse: count > 0,
        }}
        canManage={canManage}
        promoteLabel={promoteLabel}
        backHref={backHref}
        language={language}
        labels={{
          ...detail,
          readOnly: formatMessage(
            detail.readOnly,
            { owner: ownerName ?? common.scopes[type.scope] },
            words,
          ),
          promoteHint: detail.promote.hint,
          promoteDone: detail.promote.done,
          archivedBadge: strings.archived,
          photoAlt: strings.photoAlt,
          wheelchairYes: strings.wheelchairYes,
          wheelchairNo: strings.wheelchairNo,
          seatOptions: seatOptions(dict, language),
          cancel: strings.cancel,
          field: { ...strings.field, errors: common.errors },
          status: strings.status,
          gallery: { ...common.gallery, errors: common.errors },
          markdown: markdownToolLabels(dict),
          manualLabels: common.manual,
        }}
      />
    </>
  );
}
