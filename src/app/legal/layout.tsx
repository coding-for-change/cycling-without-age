import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas">
      <div className="mx-auto w-full max-w-2xl px-6 py-10 lg:py-16">
        <Link href="/">
          <Image
            src="/logo.png"
            alt="Cycling Without Age"
            width={112}
            height={40}
            className="h-10 w-auto"
          />
        </Link>
        <main className="mt-10">{children}</main>
      </div>
    </div>
  );
}
