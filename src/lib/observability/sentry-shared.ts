import type {
  Breadcrumb,
  ErrorEvent,
  Log,
  SamplingContext,
  TransactionEvent,
} from "@sentry/core";
import { CALENDAR_FEED_TOKEN, scrubObject, scrubText } from "./errors";

export type Service = "web" | "worker";

type RequestData = NonNullable<ErrorEvent["request"]>;

export const DEFAULT_TRACE_RATE = 0.2;
export const SERVER_ACTION_TRACE_RATE = 0.5;

const UNTRACED = [
  /^\/api\/calendar\//,
  /^\/api\/chat\/stream(?:[/?]|$)/,
  /^\/api\/health(?:[/?]|$)/,
  /^\/metrics(?:[/?]|$)/,
  /^\/monitoring(?:[/?]|$)/,
  /^\/_next\//,
];

const REPLAY_FORBIDDEN = [/\/chat(?:\/|$)/, /^\/admin\/passengers(?:\/|$)/];

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
]);

export const scrubUrl = (url: string): string =>
  url.replace(/\?.*$/, "").replace(CALENDAR_FEED_TOKEN, "$1[token]");

const pathOf = (value: string): string => {
  const withoutMethod = value.replace(/^[A-Z]+\s+/, "");
  try {
    return new URL(withoutMethod, "http://local").pathname;
  } catch {
    return withoutMethod;
  }
};

export const isUntraced = (target: string | undefined): boolean =>
  typeof target === "string" && UNTRACED.some((rx) => rx.test(pathOf(target)));

export const isReplayForbidden = (pathname: string): boolean =>
  REPLAY_FORBIDDEN.some((rx) => rx.test(pathname));

const targetOf = (context: SamplingContext): string | undefined => {
  const attributes = context.attributes ?? {};
  const candidates = [
    attributes["http.target"],
    attributes["url.path"],
    attributes["http.route"],
    context.name,
  ];
  return candidates.find((value): value is string => typeof value === "string");
};

export function tracesSampler(context: SamplingContext): number {
  if (isUntraced(targetOf(context)) || isUntraced(context.name)) return 0;
  if (context.attributes?.["sentry.op"] === "function.server_action")
    return SERVER_ACTION_TRACE_RATE;
  return context.inheritOrSampleWith(DEFAULT_TRACE_RATE);
}

const scrubRequest = (
  request: RequestData | undefined,
): RequestData | undefined => {
  if (!request) return request;
  const rest: RequestData = { ...request };
  delete rest.cookies;
  delete rest.data;
  delete rest.query_string;
  const headers = rest.headers
    ? Object.fromEntries(
        Object.entries(rest.headers).filter(
          ([key]) => !SENSITIVE_HEADERS.has(key.toLowerCase()),
        ),
      )
    : undefined;
  return {
    ...rest,
    ...(headers ? { headers } : {}),
    ...(rest.url ? { url: scrubUrl(rest.url) } : {}),
  };
};

const scrubBreadcrumb = (breadcrumb: Breadcrumb): Breadcrumb => ({
  ...breadcrumb,
  ...(breadcrumb.message ? { message: scrubText(breadcrumb.message) } : {}),
  ...(breadcrumb.data
    ? { data: scrubObject(breadcrumb.data) as Breadcrumb["data"] }
    : {}),
});

export function beforeSend(event: ErrorEvent): ErrorEvent | null {
  const request = scrubRequest(event.request);
  return {
    ...event,
    ...(request ? { request } : {}),
    user: event.user?.id ? { id: event.user.id } : undefined,
    ...(event.extra
      ? { extra: scrubObject(event.extra) as ErrorEvent["extra"] }
      : {}),
    ...(event.contexts
      ? { contexts: scrubObject(event.contexts) as ErrorEvent["contexts"] }
      : {}),
    ...(event.message ? { message: scrubText(event.message) } : {}),
    ...(event.exception?.values
      ? {
          exception: {
            ...event.exception,
            values: event.exception.values.map((value) =>
              value.value ? { ...value, value: scrubText(value.value) } : value,
            ),
          },
        }
      : {}),
    ...(event.breadcrumbs
      ? { breadcrumbs: event.breadcrumbs.map(scrubBreadcrumb) }
      : {}),
  };
}

export function beforeSendTransaction(
  event: TransactionEvent,
): TransactionEvent | null {
  if (isUntraced(event.transaction)) return null;
  const request = scrubRequest(event.request);
  return {
    ...event,
    ...(request ? { request } : {}),
    user: event.user?.id ? { id: event.user.id } : undefined,
  };
}

export function beforeBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.category === "console") return null;
  const url = breadcrumb.data?.url;
  const isHttp =
    breadcrumb.category === "fetch" || breadcrumb.category === "xhr";
  if (isHttp && typeof url === "string" && isUntraced(url)) return null;
  return scrubBreadcrumb(breadcrumb);
}

export function beforeSendLog(log: Log): Log | null {
  return {
    ...log,
    message: scrubText(log.message) as Log["message"],
    ...(log.attributes
      ? { attributes: scrubObject(log.attributes) as Log["attributes"] }
      : {}),
  };
}

export const ignoreErrors: Array<string | RegExp> = [
  /ResizeObserver loop/,
  /^AbortError/,
  /Load failed/,
  /Failed to fetch/,
  /NetworkError when attempting to fetch/,
  /Non-Error promise rejection captured/,
];

export type BaseOptionsInput = {
  dsn: string | undefined;
  service: Service;
  environment?: string;
  release?: string;
};

export function baseOptions({
  dsn,
  service,
  environment,
  release,
}: BaseOptionsInput) {
  return {
    dsn: dsn || undefined,
    enabled: Boolean(dsn),
    environment: environment ?? process.env.SENTRY_ENVIRONMENT ?? "development",
    release: release ?? process.env.SENTRY_RELEASE,
    sendDefaultPii: false,
    initialScope: { tags: { service } },
    tracesSampler,
    beforeSend,
    beforeSendTransaction,
    beforeBreadcrumb,
    beforeSendLog,
    ignoreErrors,
  };
}
