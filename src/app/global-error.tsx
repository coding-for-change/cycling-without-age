"use client";

import "./globals.css";
import { ErrorFallback } from "@/components/error-fallback";
import { Toaster } from "@/components/ui/sonner";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="flex min-h-full flex-col bg-canvas font-sans text-ink">
        <ErrorFallback
          error={error}
          retry={retry}
        />
        <Toaster />
      </body>
    </html>
  );
}
