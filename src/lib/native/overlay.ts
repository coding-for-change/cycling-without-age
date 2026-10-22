import { useSyncExternalStore } from "react";

export const OVERLAY_SELECTOR =
  '[role="dialog"][data-state="open"], [role="menu"][data-state="open"], [data-vaul-drawer][data-state="open"]';

export const isOverlayOpen = (root: ParentNode = document) =>
  root.querySelector(OVERLAY_SELECTOR) !== null;

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-state"],
  });
  return () => observer.disconnect();
};

export const useOverlayOpen = () =>
  useSyncExternalStore(subscribe, () => isOverlayOpen(), () => false);
