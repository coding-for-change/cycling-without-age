"use client";

import { useEffect } from "react";

/**
 * Drawers, dialogs, menus and toasts render into <body>, outside the passenger
 * pages' `data-text-scale` subtree. While a passenger page is open, <html>
 * says so, and globals.css (§ Text size) lets those layers follow the size too.
 */
export function TextScaleScope() {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.textScope = "passenger";
    return () => {
      delete root.dataset.textScope;
    };
  }, []);
  return null;
}
