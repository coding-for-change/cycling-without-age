import type { BrowserContext } from "@playwright/test";

const script = () => {
  const install = () => {
    if (document.getElementById("__docs-cursor")) return;
    const style = document.createElement("style");
    style.textContent = `
      nextjs-portal{display:none!important}
      #__docs-cursor{position:fixed;top:0;left:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);transition:transform 40ms linear}
      #__docs-cursor svg{filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))}
      .__docs-ripple{position:fixed;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:2px solid #e8532f;z-index:2147483646;pointer-events:none;animation:__docs-r .5s ease-out forwards}
      @keyframes __docs-r{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}
      #__docs-tick{position:fixed;left:0;bottom:0;width:2px;height:2px;background:#fff;z-index:2147483647;pointer-events:none;animation:__docs-t 1s steps(2) infinite}
      @keyframes __docs-t{from{opacity:.01}to{opacity:.02}}`;
    document.documentElement.appendChild(style);
    const cursor = document.createElement("div");
    cursor.id = "__docs-cursor";
    cursor.innerHTML =
      '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2l16 10-7 1.5 4 7.5-3 1.5-4-7.5L4 19z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(cursor);
    const tick = document.createElement("div");
    tick.id = "__docs-tick";
    document.documentElement.appendChild(tick);
    const move = (x: number, y: number) => {
      cursor.style.transform = `translate(${x - 4}px,${y - 2}px)`;
    };
    window.addEventListener(
      "mousemove",
      (e) => move(e.clientX, e.clientY),
      true,
    );
    window.addEventListener(
      "mousedown",
      (e) => {
        const r = document.createElement("div");
        r.className = "__docs-ripple";
        r.style.left = `${e.clientX}px`;
        r.style.top = `${e.clientY}px`;
        document.documentElement.appendChild(r);
        setTimeout(() => r.remove(), 600);
      },
      true,
    );
    window.addEventListener(
      "touchstart",
      (e) => {
        const t = e.touches[0];
        if (!t) return;
        move(t.clientX, t.clientY);
        const r = document.createElement("div");
        r.className = "__docs-ripple";
        r.style.left = `${t.clientX}px`;
        r.style.top = `${t.clientY}px`;
        document.documentElement.appendChild(r);
        setTimeout(() => r.remove(), 600);
      },
      true,
    );
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }
};

export async function installCursor(context: BrowserContext) {
  await context.addInitScript(script);
}
