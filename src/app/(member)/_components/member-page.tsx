/// <reference types="react/canary" />
import { ViewTransition, type ReactNode } from "react";
import { MEMBER_ENTER, MEMBER_EXIT } from "./member-transitions";
import { cn } from "@/lib/utils";

export function MemberPageShell({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <ViewTransition
      enter={MEMBER_ENTER}
      exit={MEMBER_EXIT}
      default="none"
    >
      <div
        className={cn(
          "mx-auto flex w-full flex-1 flex-col gap-6 px-4 pt-2 pb-8 lg:px-6",
          wide ? "max-w-6xl" : "max-w-2xl",
        )}
      >
        {children}
      </div>
    </ViewTransition>
  );
}
