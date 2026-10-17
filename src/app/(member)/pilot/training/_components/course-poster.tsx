/// <reference types="react/canary" />
import { ViewTransition } from "react";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { posterTransitionName } from "./format";

export function CoursePoster({
  courseId,
  src,
  className,
  priority = false,
}: {
  courseId: string;
  src: string | null;
  className?: string;
  priority?: boolean;
}) {
  return (
    <ViewTransition name={posterTransitionName(courseId)}>
      <div
        className={cn(
          "relative aspect-video w-full overflow-hidden bg-mint-tint",
          className,
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            decoding="async"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            className="size-full object-cover"
          />
        ) : (
          <span className="grid size-full place-items-center text-mint-ink">
            <GraduationCap
              className="size-10"
              aria-hidden
            />
          </span>
        )}
      </div>
    </ViewTransition>
  );
}
