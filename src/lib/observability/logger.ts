import pino from "pino";
import type { DestinationStream, Logger } from "pino";
import { getActiveSpan, getCurrentScope, spanToJSON } from "@sentry/core";
import { REDACTED, SENSITIVE_KEYS, serializeError } from "./errors";

const HEADER_PATHS = [
  "headers.authorization",
  "headers.cookie",
  "headers['set-cookie']",
  "req.headers.authorization",
  "req.headers.cookie",
];

const REDACT_PATHS = [
  ...new Set([
    ...SENSITIVE_KEYS,
    ...SENSITIVE_KEYS.map((key) => `*.${key}`),
    ...HEADER_PATHS,
  ]),
];

const serviceName = () => process.env.CWA_SERVICE ?? "web";

const environment = () =>
  process.env.SENTRY_ENVIRONMENT ??
  process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
  process.env.NODE_ENV ??
  "development";

const release = () => process.env.SENTRY_RELEASE ?? "dev";

const isTest = () => process.env.NODE_ENV === "test";

const sink: DestinationStream = { write: () => {} };

function traceFields() {
  try {
    const span = getActiveSpan();
    if (span) {
      const json = spanToJSON(span);
      return { trace_id: json.trace_id, span_id: json.span_id };
    }
    const propagation = getCurrentScope().getPropagationContext();
    return {
      trace_id: propagation.traceId,
      ...(propagation.parentSpanId
        ? { span_id: propagation.parentSpanId }
        : {}),
    };
  } catch {
    return {};
  }
}

// The worker sets CWA_SERVICE after its imports have run, so a logger without
// an explicit service resolves it per line instead of freezing it in `base`.
export function createLogger(
  service?: string,
  destination?: DestinationStream,
): Logger {
  const options = {
    level:
      process.env.LOG_LEVEL ??
      (process.env.NODE_ENV === "production" ? "info" : "debug"),
    base: {
      ...(service === undefined ? {} : { service }),
      env: environment(),
      release: release(),
    },
    formatters: { level: (label: string) => ({ level: label }) },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: { paths: REDACT_PATHS, censor: REDACTED },
    serializers: {
      err: (value: unknown) =>
        value instanceof Error ? serializeError(value) : value,
    },
    mixin: () => ({
      ...(service === undefined ? { service: serviceName() } : {}),
      ...traceFields(),
    }),
  };

  const target = destination ?? (isTest() ? sink : undefined);
  return target === undefined ? pino(options) : pino(options, target);
}

export const logger = createLogger();

export const childLogger = (bindings: Record<string, unknown>) =>
  logger.child(bindings);

export type DomainEventLine = {
  id?: string;
  type: string;
  chapterId?: string | null;
  actorUserId?: string | null;
};

export function logDomainEvent(
  event: DomainEventLine,
  extra?: Record<string, unknown>,
) {
  logger.info(
    {
      event: event.type,
      isBusinessEvent: true,
      ...(event.id ? { event_id: event.id } : {}),
      ...(event.chapterId ? { chapter_id: event.chapterId } : {}),
      ...(event.actorUserId ? { user_id: event.actorUserId } : {}),
      ...extra,
    },
    event.type,
  );
}

const noop = () => {};

export const devConsole =
  process.env.NODE_ENV === "production"
    ? { log: noop, info: noop, warn: noop, error: noop }
    : {
        log: (...args: unknown[]) => console.log(...args),
        info: (...args: unknown[]) => console.info(...args),
        warn: (...args: unknown[]) => console.warn(...args),
        error: (...args: unknown[]) => console.error(...args),
      };
