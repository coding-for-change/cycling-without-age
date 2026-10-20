import { Suspense, type ReactNode } from "react";
import { preconnect } from "react-dom";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { requireAuth } from "@/lib/auth-guards";
import { isTrainingRequired } from "@/lib/feature-flags";
import { resolveLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { courseOverview } from "@/use-cases/training-access";
import { CourseFrame, CourseOutlinePanel } from "../_components/course-frame";
import { TRAINING_LIFE, courseHref } from "../_components/format";
import { outlineOf } from "../_components/outline";
import { OutlineSkeleton } from "../_components/skeletons";

const mediaOrigin = () => {
  try {
    return new URL(process.env.MEDIA_PUBLIC_URL ?? "").origin;
  } catch {
    return null;
  }
};

export default function CourseLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  const media = mediaOrigin();
  if (media) preconnect(media, { crossOrigin: "anonymous" });
  return (
    <CourseFrame
      outline={
        <Suspense fallback={<OutlineSkeleton />}>
          <Outline params={params} />
        </Suspense>
      }
    >
      {children}
    </CourseFrame>
  );
}

async function Outline({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  return <OutlineBody courseId={courseId} />;
}

async function OutlineBody({ courseId }: { courseId: string }) {
  "use cache: private";
  cacheLife(TRAINING_LIFE);

  const session = await requireAuth();
  if (!isTrainingRequired()) return null;
  const [card, dict, language, head] = await Promise.all([
    courseOverview(session.user.id, courseId),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  if (!card) return null;
  const notation = resolveLocale(head.get("accept-language"));
  const outline = outlineOf(card, dict, language, notation);

  return (
    <CourseOutlinePanel
      title={card.title}
      courseHref={courseHref(courseId)}
      backLabel={dict.pilot.training.lesson.back}
      {...outline}
    />
  );
}
