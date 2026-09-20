import type Redis from "ioredis";
import { createRedisClient } from "@/lib/redis";
import { withTimeout } from "@/lib/with-timeout";
import { userChannel } from "./channels";
import { parseRealtimeEvent, type RealtimeEvent } from "./events";

export type RealtimeHandler = (event: RealtimeEvent) => void;
export type Unsubscribe = () => void;

const PUBLISH_TIMEOUT_MS = 2_000;

// A failed publish carries the message body in `error.command.args`, so only the reason is logged.
const reasonOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

type Hub = {
  commands: Redis | null;
  subscriber: Redis | null;
  handlers: Map<string, Set<RealtimeHandler>>;
};

const globalForHub = globalThis as unknown as { realtimeHub: Hub | undefined };

const hub: Hub = globalForHub.realtimeHub ?? {
  commands: null,
  subscriber: null,
  handlers: new Map(),
};

if (process.env.NODE_ENV !== "production") globalForHub.realtimeHub = hub;

export function commandClient(): Redis {
  if (hub.commands) return hub.commands;

  const client = createRedisClient();
  client.on("error", (error: Error) =>
    console.error("realtime commands", error),
  );
  hub.commands = client;
  return client;
}

function deliver(channel: string, payload: string) {
  const handlers = hub.handlers.get(channel);
  if (!handlers || handlers.size === 0) return;

  let raw: unknown;
  try {
    raw = JSON.parse(payload);
  } catch {
    return;
  }

  const event = parseRealtimeEvent(raw);
  if (!event) return;

  for (const handler of [...handlers]) {
    try {
      handler(event);
    } catch (error) {
      console.error(`realtime handler on ${channel}`, error);
    }
  }
}

function subscriberClient(): Redis {
  if (hub.subscriber) return hub.subscriber;

  const client = createRedisClient();
  client.on("message", (channel: string, payload: string) =>
    deliver(channel, payload),
  );
  client.on("error", (error: Error) =>
    console.error("realtime subscriber", error),
  );
  hub.subscriber = client;
  return client;
}

export function subscribe(
  channel: string,
  handler: RealtimeHandler,
): Unsubscribe {
  const client = subscriberClient();
  const handlers = hub.handlers.get(channel);

  if (handlers) {
    handlers.add(handler);
  } else {
    hub.handlers.set(channel, new Set([handler]));
    void client
      .subscribe(channel)
      .catch((error) =>
        console.error(`realtime subscribe to ${channel}`, error),
      );
  }

  let live = true;
  return () => {
    if (!live) return;
    live = false;

    const current = hub.handlers.get(channel);
    if (!current) return;

    current.delete(handler);
    if (current.size > 0) return;

    hub.handlers.delete(channel);
    void client
      .unsubscribe(channel)
      .catch((error) =>
        console.error(`realtime unsubscribe from ${channel}`, error),
      );
  };
}

export async function publish(
  channel: string,
  event: RealtimeEvent,
): Promise<void> {
  try {
    await withTimeout(
      commandClient().publish(channel, JSON.stringify(event)),
      PUBLISH_TIMEOUT_MS,
    );
  } catch (error) {
    console.error(`realtime publish to ${channel}`, reasonOf(error));
  }
}

export async function publishToUsers(
  userIds: string[],
  event: RealtimeEvent,
): Promise<void> {
  const recipients = [...new Set(userIds)];
  if (recipients.length === 0) return;

  const payload = JSON.stringify(event);
  const pipeline = commandClient().pipeline();
  for (const userId of recipients)
    pipeline.publish(userChannel(userId), payload);

  try {
    await withTimeout(pipeline.exec(), PUBLISH_TIMEOUT_MS);
  } catch (error) {
    console.error(
      `realtime publish to ${recipients.length} users`,
      reasonOf(error),
    );
  }
}

export async function closeRealtime(): Promise<void> {
  const clients = [hub.commands, hub.subscriber].filter(
    (client): client is Redis => client !== null,
  );

  hub.commands = null;
  hub.subscriber = null;
  hub.handlers.clear();

  await Promise.allSettled(clients.map((client) => client.quit()));
}
