"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";

type Claim = { owner: string; title: string };

type MemberTitleContext = {
  claim: Claim | null;
  setClaim: (update: (current: Claim | null) => Claim | null) => void;
};

const Context = createContext<MemberTitleContext | null>(null);

export function MemberTitleProvider({ children }: { children: ReactNode }) {
  const [claim, setClaim] = useState<Claim | null>(null);
  return <Context value={{ claim, setClaim }}>{children}</Context>;
}

export function useMemberTitle(title: string | null | undefined) {
  const context = useContext(Context);
  const owner = useId();
  const setClaim = context?.setClaim;

  useEffect(() => {
    if (!setClaim || !title) return;
    setClaim(() => ({ owner, title }));
    return () =>
      setClaim((current) => (current?.owner === owner ? null : current));
  }, [setClaim, owner, title]);
}

export function usePageTitle(): string | null {
  return useContext(Context)?.claim?.title ?? null;
}

export function MemberTitle({ title }: { title: string | null | undefined }) {
  useMemberTitle(title);
  return null;
}
