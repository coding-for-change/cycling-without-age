import type { ConnectionOptions } from "bullmq";

const url = process.env.REDIS_URL ?? "redis://localhost:6380";

export const redisConnection: ConnectionOptions = {
  url,
  maxRetriesPerRequest: null,
};
