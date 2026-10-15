import { Suspense } from "react";
import { notFound } from "next/navigation";
import { chapters } from "@/features/chapters";
import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import { requireAuth } from "@/lib/auth-guards";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { StepSkeleton } from "../../_components/step";
import { StepTransition } from "../../_components/step-transition";
import { CareRequestStep } from "./_components/care-request-step";

export default function CareRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  return (
    <StepTransition>
      <Suspense fallback={<StepSkeleton />}>
        <CareRequest params={params} />
      </Suspense>
    </StepTransition>
  );
}

async function CareRequest({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const session = await requireAuth();
  const { requestId } = await params;
  const request = await passengers.getCareRequestPreview(requestId);
  if (!request || request.caretakerUserId !== session.user.id) notFound();

  const [chapter, requester, dict, locale] = await Promise.all([
    chapters.getChapter(request.chapterId),
    request.requestedByUserId
      ? profile.getProfile(request.requestedByUserId)
      : null,
    getDictionary(),
    getLocale(),
  ]);
  const strings = dict.care;
  const values = {
    rider: request.firstName,
    requester: requester?.name || chapter?.name || "",
    chapter: chapter?.name ?? "",
  };
  const say = (template: string) => formatMessage(template, values, locale);

  return (
    <CareRequestStep
      requestId={request.id}
      status={request.status}
      strings={{
        title: say(strings.title),
        body: say(strings.body),
        accept: say(strings.accept),
        decline: strings.decline,
        acceptedTitle: say(strings.acceptedTitle),
        acceptedBody: say(strings.acceptedBody),
        declinedTitle: strings.declinedTitle,
        declinedBody: say(strings.declinedBody),
        open: strings.open,
        errors: {
          passengerChapterMismatch: say(
            strings.errors.passengerChapterMismatch,
          ),
          tooManyRiders: strings.errors.tooManyRiders,
          generic: strings.errors.generic,
        },
      }}
    />
  );
}
