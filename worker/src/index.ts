import { ApiError } from "../../server/src/api/errors";
import { getPlayerRecordsResponse, getSearchPlayerResponse } from "../../server/src/api/players";
import { getPlayerStyleResponse } from "../../server/src/api/style";

interface Env {
  ASSETS: Fetcher;
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");

  return new Response(JSON.stringify(body), {
    ...init,
    headers
  });
}

function apiErrorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return jsonResponse({ error: { code: error.code, message: error.message } }, { status: error.status });
  }

  return jsonResponse(
    { error: { code: "internal_error", message: "Internal server error" } },
    { status: 500 }
  );
}

async function handleApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  try {
    if (request.method !== "GET") {
      return jsonResponse({ error: { code: "not_found", message: "Route not found" } }, { status: 404 });
    }

    if (url.pathname === "/api/health") {
      return jsonResponse({ ok: true });
    }

    if (url.pathname === "/api/search-player") {
      return jsonResponse(await getSearchPlayerResponse(url.searchParams));
    }

    if (url.pathname === "/api/player-records") {
      return jsonResponse(await getPlayerRecordsResponse(url.searchParams));
    }

    if (url.pathname === "/api/player-style") {
      return jsonResponse(await getPlayerStyleResponse(url.searchParams));
    }

    return jsonResponse({ error: { code: "not_found", message: "Route not found" } }, { status: 404 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return handleApiRequest(request);
    }

    return env.ASSETS.fetch(request);
  }
} satisfies ExportedHandler<Env>;
