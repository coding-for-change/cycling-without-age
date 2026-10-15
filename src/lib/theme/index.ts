export const THEME_COOKIE = "NEXT_THEME";

export const themes = ["light", "dark", "system"] as const;
export type Theme = (typeof themes)[number];
export type ResolvedTheme = Exclude<Theme, "system">;

export const isTheme = (value: unknown): value is Theme =>
  themes.includes(value as Theme);

export const THEME_COLOR = { light: "#ffffff", dark: "#1c1916" } as const;

export const themeScript = `(function(){try{var d=document.documentElement,c=document.cookie,m=c.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/),t=m&&m[1],q=matchMedia("(prefers-color-scheme: dark)");if(${JSON.stringify(themes)}.indexOf(t)<0)t="system";var a=function(){var r=d.dataset.theme||"system";var k=r==="dark"||(r==="system"&&q.matches);d.classList.toggle("dark",k);d.style.colorScheme=k?"dark":"light"};d.dataset.theme=t;a();q.addEventListener("change",a)}catch(e){}})()`;
