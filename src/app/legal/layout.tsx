import { Suspense, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import { LegalBackButton } from "./_components/legal-back-button";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas">
      <div className="mx-auto w-full max-w-2xl px-6 pt-[max(2.5rem,calc(env(safe-area-inset-top)+1rem))] pb-[max(2.5rem,env(safe-area-inset-bottom))] lg:py-16">
        <div className="flex items-center gap-4">
          <LegalBackButton
            label={
              <Suspense fallback={null}>
                <BackLabel />
              </Suspense>
            }
          />
          <Link href="/">
            <Image
              src="/logo.png"
              alt="Cycling Without Age"
              width={112}
              height={40}
              className="h-10 w-auto"
            />
          </Link>
        </div>
        <main className="mt-10">{children}</main>
      </div>
    </div>
  );
}

async function BackLabel() {
  return (await getDictionary()).common.back;
}
