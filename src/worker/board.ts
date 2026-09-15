import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import express from "express";
import type { Server } from "node:http";
import { QUEUE, queue } from "@/lib/events/queues";
import type { Health } from "./health";

const BASE_PATH = "/queues";

export function startBoard(port: number, health: () => Promise<Health>) {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(BASE_PATH);

  createBullBoard({
    queues: Object.values(QUEUE).map((name) => new BullMQAdapter(queue(name))),
    serverAdapter,
  });

  const app = express();
  app.use(BASE_PATH, serverAdapter.getRouter());
  app.get("/", (_request, response) => response.redirect(BASE_PATH));
  app.get("/health", async (_request, response) => {
    const result = await health();
    response.status(result.ok ? 200 : 503).json(result);
  });

  return new Promise<Server>((resolve) => {
    const server = app.listen(port, () => resolve(server));
  });
}
