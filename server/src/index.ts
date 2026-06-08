import express from "express";
import type { Server } from "node:http";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { errorHandler } from "./routes/errors";
import { playersRouter } from "./routes/players";
import { styleRouter } from "./routes/style";

const dirname = path.dirname(fileURLToPath(import.meta.url));
let activeServer: Server | undefined;

type StartServerOptions = {
  clientDist?: string;
  host?: string;
  log?: (message: string) => void;
  port?: number;
};

function resolveClientDist(clientDistOverride?: string): string {
  if (clientDistOverride) return clientDistOverride;

  const bundledClientDist = path.resolve(dirname, "../client");
  if (existsSync(path.join(bundledClientDist, "index.html"))) return bundledClientDist;

  return path.resolve(dirname, "../../dist/client");
}

export function createApp(options: { clientDist?: string } = {}) {
  const app = express();
  const clientDist = resolveClientDist(options.clientDist);

  app.get("/api/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.use("/api", playersRouter);
  app.use("/api/player-style", styleRouter);

  app.use("/api", (_request, response) => {
    response.status(404).json({ error: { code: "not_found", message: "Route not found" } });
  });

  app.use(errorHandler);

  app.use(express.static(clientDist));

  app.use((_request, response) => {
    response.sendFile("index.html", { root: clientDist });
  });

  return app;
}

export function startServer(options: StartServerOptions = {}): Server {
  const port = options.port ?? Number(process.env.PORT ?? 11000);
  const host = options.host ?? "0.0.0.0";
  const log = options.log ?? console.log;
  const server = createApp({ clientDist: options.clientDist }).listen(port, host, () => {
    const address = server.address();
    const resolvedPort = typeof address === "object" && address ? address.port : port;
    log(`Majsoul Graph listening on ${resolvedPort}`);
  });

  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  activeServer = startServer();
}
