import { withTimeout } from "@/lib/with-timeout";
import { PRESENCE_CHANNEL } from "./channels";
import { commandClient, publish } from "./hub";

export const PRESENCE_TTL_SECONDS = 60;

const COMMAND_TIMEOUT_MS = 2_000;

const presenceKey = (userId: string) => `presence:${userId}`;
const focusKey = (userId: string) => `focus:${userId}`;

async function guard<T>(
  run: () => Promise<T>,
  fallback: T,
  what: string,
): Promise<T> {
  try {
    return await withTimeout(run(), COMMAND_TIMEOUT_MS);
  } catch (error) {
    console.error(`realtime presence ${what}`, error);
    return fallback;
  }
}

async function writeFocus(userId: string, focus: string | null) {
  if (focus)
    await guard<string | null>(
      () =>
        commandClient().set(
          focusKey(userId),
          focus,
          "EX",
          PRESENCE_TTL_SECONDS,
        ),
      null,
      "focus",
    );
  else await guard(() => commandClient().del(focusKey(userId)), 0, "focus");
}

export async function connect(
  userId: string,
  focus: string | null,
): Promise<void> {
  const connections = await guard(
    () => commandClient().incr(presenceKey(userId)),
    0,
    "connect",
  );
  await guard(
    () => commandClient().expire(presenceKey(userId), PRESENCE_TTL_SECONDS),
    0,
    "connect",
  );
  await writeFocus(userId, focus);

  if (connections === 1)
    await publish(PRESENCE_CHANNEL, { type: "presence", userId, online: true });
}

export async function heartbeat(
  userId: string,
  focus: string | null,
): Promise<void> {
  const refreshed = await guard(
    () => commandClient().expire(presenceKey(userId), PRESENCE_TTL_SECONDS),
    0,
    "heartbeat",
  );
  if (refreshed === 0) return connect(userId, focus);

  await writeFocus(userId, focus);
}

export async function disconnect(userId: string): Promise<void> {
  const remaining = await guard(
    () => commandClient().decr(presenceKey(userId)),
    0,
    "disconnect",
  );

  if (remaining > 0) {
    await guard(
      () => commandClient().expire(presenceKey(userId), PRESENCE_TTL_SECONDS),
      0,
      "disconnect",
    );
    return;
  }

  await guard(
    () => commandClient().del(presenceKey(userId), focusKey(userId)),
    0,
    "disconnect",
  );
  await publish(PRESENCE_CHANNEL, { type: "presence", userId, online: false });
}

export async function isOnline(userIds: string[]): Promise<Set<string>> {
  const unique = [...new Set(userIds)];
  const online = new Set<string>();
  if (unique.length === 0) return online;

  const pipeline = commandClient().pipeline();
  for (const userId of unique) pipeline.exists(presenceKey(userId));

  const results = await guard(() => pipeline.exec(), null, "isOnline");
  if (!results) return online;

  results.forEach(([error, value], index) => {
    if (!error && Number(value) > 0) online.add(unique[index]);
  });
  return online;
}

export async function isFocusedOn(
  userId: string,
  conversationId: string,
): Promise<boolean> {
  const focus = await guard(
    () => commandClient().get(focusKey(userId)),
    null,
    "isFocusedOn",
  );
  return focus === conversationId;
}
