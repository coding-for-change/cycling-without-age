import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";
import { readNextPath, requireAuth } from "@/lib/auth-guards";
import { readJoinPreset } from "@/lib/join-preset";
import { resolveDestination } from "@/use-cases/onboarding-progress";

export default function OnboardingPage() {
  return (
    <Suspense fallback={<Waiting />}>
      <Resolve />
    </Suspense>
  );
}

function Waiting() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas">
      <Loader2
        className="size-6 animate-spin text-ink-faint motion-reduce:animate-none"
        aria-hidden
      />
    </div>
  );
}

async function Resolve(): Promise<null> {
  const session = await requireAuth();
  const [preset, next] = await Promise.all([readJoinPreset(), readNextPath()]);
  redirect(await resolveDestination(session, preset, next));
}
