"use client";

import { useEffect } from "react";

let printed = false;

export function AutoPrint() {
  useEffect(() => {
    if (printed) return;
    printed = true;
    const print = () => window.print();
    if (document.fonts) document.fonts.ready.then(print);
    else setTimeout(print, 300);
  }, []);

  return null;
}
