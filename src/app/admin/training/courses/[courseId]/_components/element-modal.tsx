"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LARGE_DIALOG } from "@/features/training/components/large-dialog";

const CloseContext = createContext<() => void>(() => {});

export const useCloseElement = () => useContext(CloseContext);

const editing = (element: Element | null) =>
  element instanceof HTMLElement &&
  (element.isContentEditable ||
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.tagName === "SELECT");

export function ElementModalFrame({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(true);

  const close = useCallback(() => {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("element");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  return (
    <CloseContext value={close}>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      >
        <DialogContent
          showCloseButton={false}
          aria-describedby={undefined}
          className={LARGE_DIALOG}
          onEscapeKeyDown={(event) => {
            const active = document.activeElement;
            if (editing(active)) {
              event.preventDefault();
              (active as HTMLElement).blur();
            }
          }}
          onKeyDown={(event) => {
            if (
              event.defaultPrevented ||
              event.key !== "Enter" ||
              !(event.metaKey || event.ctrlKey)
            )
              return;
            event.preventDefault();
            const active = document.activeElement;
            if (active instanceof HTMLElement) active.blur();
            close();
          }}
        >
          {children}
        </DialogContent>
      </Dialog>
    </CloseContext>
  );
}
