import { Suspense, type ReactNode } from "react";
import { getDictionary } from "@/lib/i18n";
import { FlowChrome } from "./_components/flow-chrome";

export default function FlowLayout({ children }: { children: ReactNode }) {
  return (
    <FlowChrome
      backLabel={
        <Suspense fallback={null}>
          <BackLabel />
        </Suspense>
      }
    >
      {children}
    </FlowChrome>
  );
}

async function BackLabel() {
  return (await getDictionary()).common.back;
}
