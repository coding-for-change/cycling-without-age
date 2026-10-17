"use client";

import { PerspectiveRow } from "@/components/account/perspective-row";
import {
  AccountSectionBody,
  accountSections,
  sectionTitle,
  type AccountSectionKey,
} from "@/components/account/sections";
import type { AccountData } from "@/components/account/types";

const stay = () => {};

/**
 * Sections of the account sheet, laid into the page on the sheet's own ground
 * so its grouped lists read as they do there. Only the ones asked for, and
 * only those the sheet would show this person.
 */
export function AccountSections({
  data,
  only,
  perspectiveSwitch = false,
}: {
  data: AccountData;
  only: readonly AccountSectionKey[];
  perspectiveSwitch?: boolean;
}) {
  const sections = accountSections(data).filter(({ key }) =>
    only.includes(key),
  );
  return (
    <div className="grid gap-5 rounded-(--r-tile) bg-canvas-deep px-3 py-5">
      {perspectiveSwitch ? (
        <PerspectiveRow
          data={data}
          activePerspective="passenger"
          onOpenChange={stay}
        />
      ) : null}
      {sections.map((item) => (
        <AccountSectionBody
          key={item.key}
          section={item.key}
          label={sectionTitle(data.strings, item.key)}
          data={data}
        />
      ))}
    </div>
  );
}
