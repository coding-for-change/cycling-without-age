/// <reference types="react/canary" />
import { ViewTransition } from "react";
import type { ReactNode } from "react";

const DIRECTIONAL = {
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  default: "none",
} as const;

export function StepTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={DIRECTIONAL}
      exit={DIRECTIONAL}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
