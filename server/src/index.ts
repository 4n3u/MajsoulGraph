import express from "express";
import type { Server } from "node:http";
import { pathToFileURL } from "node:url";

let server: Server | undefined;

export function createApp() {
  const app = express();

  app.get("/api/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.use((_request, response) => {
    response.status(404).json({ error: { code: "not_found", message: "Route not found" } });
  });

  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 10000);
  server = createApp().listen(port, "0.0.0.0", () => {
    console.log(`Majsoul Graph listening on ${port}`);
  });
  (globalThis as typeof globalThis & { __majsoulGraphServer?: Server }).__majsoulGraphServer = server;
  server.ref();
  const keepAlive = setInterval(() => undefined, 1_000_000_000);
  server.on("close", () => clearInterval(keepAlive));
}
