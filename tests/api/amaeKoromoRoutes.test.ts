import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createApp } from "../../server/src/index";

type JsonResponse = {
  status: number;
  body: unknown;
};

const originalFetch = globalThis.fetch;

async function listen(server: Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Expected TCP server address");
      resolve(address.port);
    });
  });
}

async function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function getJson(path: string): Promise<JsonResponse> {
  const server = createServer(createApp({ clientDist: "public" }));
  const port = await listen(server);

  try {
    const response = await originalFetch(`http://127.0.0.1:${port}${path}`);
    return {
      status: response.status,
      body: await response.json()
    };
  } finally {
    await close(server);
  }
}

describe("Amae-Koromo API routes", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("normalizes search-player results from upstream latest_timestamp", async () => {
    const upstreamFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          { id: 123, nickname: "Alice", latest_timestamp: 1710000000000 },
          { id: 456, nickname: "Alice2", latest_timestamp: 1710000000123 }
        ]),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", upstreamFetch);

    const response = await getJson("/api/search-player?mode=pl4&nickname=Alice");

    expect(response).toEqual({
      status: 200,
      body: {
        players: [
          { id: 123, nickname: "Alice", latestTimestamp: 1710000000000 },
          { id: 456, nickname: "Alice2", latestTimestamp: 1710000000123 }
        ]
      }
    });
    expect(upstreamFetch).toHaveBeenCalledWith(
      "https://5-data.amae-koromo.com/api/v2/pl4/search_player/Alice",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  test("returns normalized JSON error for invalid mode", async () => {
    const response = await getJson("/api/search-player?mode=sanma&nickname=Alice");

    expect(response).toEqual({
      status: 400,
      body: {
        error: {
          code: "bad_input",
          message: "mode must be pl4 or pl3"
        }
      }
    });
  });

  test("returns bad_input for blank search nickname", async () => {
    const response = await getJson("/api/search-player?mode=pl4&nickname=%20%20");

    expect(response).toEqual({
      status: 400,
      body: {
        error: {
          code: "bad_input",
          message: "nickname is required"
        }
      }
    });
  });

  test("maps non-OK upstream responses to upstream_error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 503 })));

    const response = await getJson("/api/search-player?mode=pl4&nickname=Bob");

    expect(response).toEqual({
      status: 502,
      body: {
        error: {
          code: "upstream_error",
          message: "Amae-Koromo request failed"
        }
      }
    });
  });

  test("returns player records from the legacy Amae-Koromo URL shape", async () => {
    const records = [{ uuid: "game-1", startTime: 1700000000000 }];
    const upstreamFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(records), { status: 200, headers: { "content-type": "application/json" } })
    );
    vi.stubGlobal("fetch", upstreamFetch);

    const response = await getJson(
      "/api/player-records?mode=pl3&playerId=42&startTime=1700000001&gameModes=16,12"
    );

    expect(response).toEqual({
      status: 200,
      body: { records }
    });
    expect(upstreamFetch).toHaveBeenCalledWith(
      "https://5-data.amae-koromo.com/api/v2/pl3/player_records/42/1700000001999/1262304000000?limit=500&mode=16%2C12&descending=true&tag=",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  test("exposes player-style placeholder route", async () => {
    const response = await getJson("/api/player-style");

    expect(response).toEqual({
      status: 200,
      body: {}
    });
  });
});
