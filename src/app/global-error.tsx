"use client"; // Error boundaries must be Client Components

// global-error replaces the root layout, so it must render its own
// <html>/<body> and import global styles itself.
import "./globals.css";
import { Button } from "@/components/ui/button";

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
      <body className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center font-sans">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground">
          An unexpected error occurred.
          {error.digest && ` (Error ID: ${error.digest})`}
        </p>
        <Button onClick={() => retry()}>Try again</Button>
      </body>
    </html>
  );
}
