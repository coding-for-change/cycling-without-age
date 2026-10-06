/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import type {
  PrecacheEntry,
  RouteMatchCallbackOptions,
  RuntimeCaching,
  SerwistGlobalConfig,
} from "serwist";
import {
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const OFFLINE_URL = "/~offline";

const BYPASS_PREFIXES = ["/api/", "/admin", "/serwist/", "/.well-known/"];

const SHELL_PATHS = ["/", "/sign-in", "/welcome", "/onboarding"];

const SHELL_PREFIXES = ["/pilot", "/passenger"];

const startsWithSegment = (pathname: string, prefix: string) =>
  pathname === prefix ||
  pathname.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`);

const bypassed = ({ request, url, sameOrigin }: RouteMatchCallbackOptions) =>
  request.method !== "GET" ||
  request.headers.has("Next-Router-Prefetch") ||
  (sameOrigin &&
    (url.pathname === "/monitoring" ||
      BYPASS_PREFIXES.some((prefix) =>
        startsWithSegment(url.pathname, prefix),
      )));

const isShellPath = (pathname: string) =>
  SHELL_PATHS.includes(pathname) ||
  SHELL_PREFIXES.some((prefix) => startsWithSegment(pathname, prefix));

const isRscRequest = (request: Request) => request.headers.get("RSC") === "1";

const DAY = 24 * 60 * 60;

const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: (options) =>
      !bypassed(options) &&
      options.sameOrigin &&
      options.request.mode === "navigate" &&
      isShellPath(options.url.pathname),
    handler: new NetworkFirst({
      cacheName: "shell-pages",
      networkTimeoutSeconds: 3,
      plugins: [
        new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 7 * DAY }),
      ],
    }),
  },
  {
    matcher: (options) =>
      !bypassed(options) &&
      options.sameOrigin &&
      isRscRequest(options.request) &&
      isShellPath(options.url.pathname),
    handler: new NetworkFirst({
      cacheName: "shell-rsc",
      networkTimeoutSeconds: 3,
      plugins: [
        new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: 7 * DAY }),
      ],
    }),
  },
  {
    matcher: (options) =>
      !bypassed(options) &&
      options.sameOrigin &&
      options.request.mode === "navigate",
    handler: new NetworkOnly(),
  },
  {
    matcher: (options) =>
      !bypassed(options) &&
      /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//.test(options.url.href),
    handler: new StaleWhileRevalidate({
      cacheName: "google-fonts",
      plugins: [
        new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 365 * DAY }),
      ],
    }),
  },
  {
    matcher: (options) =>
      !bypassed(options) &&
      options.sameOrigin &&
      (options.request.destination === "image" ||
        startsWithSegment(options.url.pathname, "/emoji")),
    handler: new StaleWhileRevalidate({
      cacheName: "images",
      plugins: [
        new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: 30 * DAY }),
      ],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: OFFLINE_URL,
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
