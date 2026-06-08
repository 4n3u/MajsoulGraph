import express from "express";

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

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 10000);
  createApp().listen(port, "0.0.0.0", () => {
    console.log(`Majsoul Graph listening on ${port}`);
  });
}
