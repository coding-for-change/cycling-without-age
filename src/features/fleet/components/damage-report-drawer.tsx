"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { AppDrawer } from "@/components/app-drawer";
import { Button } from "@/components/ui/button";
import { useDrawerParam } from "@/hooks/use-drawer-param";
import { reportDamageAction, reportRideDamageAction } from "../actions";
import { DamageForm, type DamageFormLabels } from "./damage-form";

const PARAM = "report";

export function DamageReportDrawer({
  trishawId,
  trishawName,
  rideId,
  paramValue = "1",
  triggerClassName,
  labels,
}: {
  trishawId: string;
  trishawName: string;
  rideId?: string;
  paramValue?: string;
  triggerClassName?: string;
  labels: DamageFormLabels & { open: string; title: string; body: string };
}) {
  const searchParams = useSearchParams();
  const { go, withParam } = useDrawerParam();
  const open = searchParams.get(PARAM) === paramValue;

  const close = () => go((params) => params.delete(PARAM));

  return (
    <>
      <Button
        asChild
        variant="outline"
        className={triggerClassName ?? "h-9 justify-start border-line text-2sm"}
      >
        <Link
          href={withParam(PARAM, paramValue)}
          replace
          scroll={false}
        >
          <TriangleAlert aria-hidden />
          {labels.open}
        </Link>
      </Button>
      <AppDrawer
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
        }}
        title={labels.title}
        description={labels.body}
      >
        {open ? (
          <DamageForm
            trishawName={trishawName}
            onSubmit={(values) =>
              rideId
                ? reportRideDamageAction({ rideId, trishawId, ...values })
                : reportDamageAction({ trishawId, ...values })
            }
            onDone={close}
            labels={labels}
          />
        ) : null}
      </AppDrawer>
    </>
  );
}
