import { reasonOf } from "@/lib/observability/errors";
import { childLogger } from "@/lib/observability/logger";
import { web } from "@/lib/observability/metrics";
import { conversationChannel, PRESENCE_CHANNEL, userChannel } from "./channels";
import type { RealtimeEvent } from "./events";

export const HEARTBEAT_MS = 25_000;
export const RETRY_MS = 3_000;

export type SseFrame = {
  id?: string | number;
  event: string;
  data: unknown;
};

export function encodeFrame({ id, event, data }: SseFrame): string {
  const head = id === undefined ? "" : `id: ${id}\n`;
  return `${head}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export type RealtimeSubscribe = (
  channel: string,
  handler: (event: RealtimeEvent) => void,
) => () => void;

export type StreamPresence = {
  connect: (userId: string, focus: string | null) => Promise<void>;
  heartbeat: (userId: string, focus: string | null) => Promise<void>;
  disconnect: (userId: string) => Promise<void>;
};

export type ChatStreamOptions = {
  userId: string;
  focus: string | null;
  contactIds: string[];
  subscribe: RealtimeSubscribe;
  presence: StreamPresence;
  signal: AbortSignal;
  refreshContacts?: () => Promise<string[]>;
};

export function createChatStream({
  userId,
  focus,
  contactIds,
  subscribe,
  presence,
  signal,
  refreshContacts,
}: ChatStreamOptions): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const contacts = new Set(contactIds);
  const offs: Array<() => void> = [];
  const log = childLogger({ user_id: userId });

  let ticker: ReturnType<typeof setInterval> | null = null;
  let counted = false;
  let opened = false;
  let closed = false;
  let release: (close: boolean) => void = () => {};

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const stop = (close: boolean) => {
        if (closed) return;
        closed = true;

        signal.removeEventListener("abort", onAbort);
        if (opened) {
          opened = false;
          web.sseConnections.dec();
        }
        if (ticker !== null) clearInterval(ticker);
        ticker = null;
        while (offs.length > 0) offs.pop()?.();

        if (counted)
          void presence
            .disconnect(userId)
            .catch((error) =>
              log.warn(
                { site: "disconnect", reason: reasonOf(error) },
                "chat stream presence disconnect failed",
              ),
            );

        if (!close) return;
        try {
          controller.close();
        } catch (error) {
          log.warn(
            { site: "close", reason: reasonOf(error) },
            "chat stream close failed",
          );
        }
      };

      function onAbort() {
        stop(true);
      }

      release = stop;

      if (signal.aborted) {
        stop(true);
        return;
      }
      signal.addEventListener("abort", onAbort);
      opened = true;
      web.sseConnections.inc();

      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          stop(false);
        }
      };

      const send = (event: RealtimeEvent) =>
        write(encodeFrame({ id: Date.now(), event: event.type, data: event }));

      write(`retry: ${RETRY_MS}\n\n`);

      offs.push(
        subscribe(userChannel(userId), (event) => {
          if (event.type === "conversation.created" && refreshContacts)
            void refreshContacts()
              .then((ids) => {
                contacts.clear();
                for (const id of ids) contacts.add(id);
              })
              .catch((error) =>
                log.warn(
                  { site: "contacts", reason: reasonOf(error) },
                  "chat stream contact refresh failed",
                ),
              );
          send(event);
        }),
      );

      if (focus)
        offs.push(
          subscribe(conversationChannel(focus), (event) => {
            if (event.type === "typing" && event.userId === userId) return;
            send(event);
          }),
        );

      offs.push(
        subscribe(PRESENCE_CHANNEL, (event) => {
          if (event.type !== "presence") return;
          if (event.userId === userId || !contacts.has(event.userId)) return;
          send(event);
        }),
      );

      ticker = setInterval(() => {
        write(": ping\n\n");
        void presence
          .heartbeat(userId, focus)
          .catch((error) =>
            log.warn(
              { site: "heartbeat", reason: reasonOf(error) },
              "chat stream heartbeat failed",
            ),
          );
      }, HEARTBEAT_MS);

      counted = true;
      await presence.connect(userId, focus);
    },
    cancel() {
      release(false);
    },
  });
}

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  "X-Accel-Buffering": "no",
} as const;
