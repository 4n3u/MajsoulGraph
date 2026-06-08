import express from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

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

  app.use("/api", (_request, response) => {
    response.status(404).json({ error: { code: "not_found", message: "Route not found" } });
  });

  app.use(express.static(clientDist));

  app.use((_request, response) => {
    response.sendFile("index.html", { root: clientDist });
  });

  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 10000);
  createApp().listen(port, "0.0.0.0", () => {
    console.log(`Majsoul Graph listening on ${port}`);
  });
}
