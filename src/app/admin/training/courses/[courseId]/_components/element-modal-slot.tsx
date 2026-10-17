import { Suspense } from "react";
import { getDictionary } from "@/lib/i18n";
import { first, type SearchParams } from "@/lib/search-params";
import { ElementModalFrame } from "./element-modal";
import { ElementModalBody } from "./element-modal-body";
import { ElementModalSkeleton } from "./element-modal-skeleton";

export async function ElementModalSlot({
  courseId,
  searchParams,
}: {
  courseId: string;
  searchParams: Promise<SearchParams>;
}) {
  const elementId = first((await searchParams).element);
  if (!elementId) return null;
  const dict = await getDictionary();
  return (
    <ElementModalFrame key={elementId}>
      <Suspense
        fallback={
          <ElementModalSkeleton label={dict.admin.training.element.trail} />
        }
      >
        <ElementModalBody
          courseId={courseId}
          elementId={elementId}
          searchParams={searchParams}
        />
      </Suspense>
    </ElementModalFrame>
  );
}
