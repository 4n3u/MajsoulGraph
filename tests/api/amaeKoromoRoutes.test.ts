import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createApp } from "../../server/src/index";
import { ApiError, errorHandler } from "../../server/src/routes/errors";
import { cachedJson, clearAmaeKoromoCache } from "../../server/src/services/amaeKoromo";

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
    clearAmaeKoromoCache();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearAmaeKoromoCache();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("normalizes search-player results from upstream latest_timestamp", async () => {
    const upstreamFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          { id: 123, nickname: "Alice", latest_timestamp: 1710000000 },
          { id: 456, nickname: "Alice2", latest_timestamp: 1710000123 }
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
          { id: 123, nickname: "Alice", latestTimestamp: 1710000000 },
          { id: 456, nickname: "Alice2", latestTimestamp: 1710000123 }
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
    const records = [{ uuid: "game-1", startTime: 1700000000 }];
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

  test("paginates full player-record pages using second-based cursors", async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) => ({
      uuid: `game-${index}`,
      startTime: 1700000500 - index
    }));
    const secondPage = [{ uuid: "game-501", startTime: 1699999999 }];
    const upstreamFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(firstPage), { status: 200, headers: { "content-type": "application/json" } })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(secondPage), { status: 200, headers: { "content-type": "application/json" } })
      );
    vi.stubGlobal("fetch", upstreamFetch);

    const response = await getJson(
      "/api/player-records?mode=pl4&playerId=42&startTime=1700000500&gameModes=16"
    );

    expect(response.status).toBe(200);
    expect((response.body as { records: unknown[] }).records).toHaveLength(501);
    expect(upstreamFetch).toHaveBeenNthCalledWith(
      1,
      "https://5-data.amae-koromo.com/api/v2/pl4/player_records/42/1700000500999/1262304000000?limit=500&mode=16&descending=true&tag=",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(upstreamFetch).toHaveBeenNthCalledWith(
      2,
      "https://5-data.amae-koromo.com/api/v2/pl4/player_records/42/1700000000999/1262304000000?limit=500&mode=16&descending=true&tag=",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  test("clearAmaeKoromoCache isolates cached upstream responses", async () => {
    const upstreamFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 1, nickname: "Cached", latest_timestamp: 1 }])))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 2, nickname: "Fresh", latest_timestamp: 2 }])));
    vi.stubGlobal("fetch", upstreamFetch);

    const first = await getJson("/api/search-player?mode=pl4&nickname=CacheProbe");
    clearAmaeKoromoCache();
    const second = await getJson("/api/search-player?mode=pl4&nickname=CacheProbe");

    expect(first.body).toEqual({ players: [{ id: 1, nickname: "Cached", latestTimestamp: 1 }] });
    expect(second.body).toEqual({ players: [{ id: 2, nickname: "Fresh", latestTimestamp: 2 }] });
    expect(upstreamFetch).toHaveBeenCalledTimes(2);
  });

  test("evicts the oldest cached JSON entry when cache reaches its max size", async () => {
    const upstreamFetch = vi.fn((url: string) => Promise.resolve(new Response(JSON.stringify({ url }))));
    vi.stubGlobal("fetch", upstreamFetch);

    await cachedJson("https://example.test/first");
    for (let index = 0; index < 100; index += 1) {
      await cachedJson(`https://example.test/${index}`);
    }
    await cachedJson("https://example.test/first");

    expect(upstreamFetch).toHaveBeenCalledTimes(102);
  });

  test("maps invalid upstream JSON to upstream_error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{not-json", { status: 200 })));

    const response = await getJson("/api/search-player?mode=pl4&nickname=BadJson");

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

  test("maps rejected upstream fetches to upstream_error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network failed")));

    const response = await getJson("/api/search-player?mode=pl4&nickname=NetworkFail");

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

  test("maps aborted upstream fetches to upstream_timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      })
    );

    const request = cachedJson("https://example.test/slow");
    const assertion = expect(request).rejects.toMatchObject({
      status: 504,
      code: "upstream_timeout",
      message: "Amae-Koromo request timed out"
    });
    await vi.advanceTimersByTimeAsync(10_000);

    await assertion;
  });

  test("exposes player-style placeholder route", async () => {
    const response = await getJson("/api/player-style");

    expect(response).toEqual({
      status: 200,
      body: {}
    });
  });

  test("delegates errors when headers have already been sent", () => {
    const next = vi.fn();
    const response = {
      headersSent: true,
      status: vi.fn(),
      json: vi.fn()
    };

    errorHandler(new ApiError(400, "bad_input", "already sent"), {} as never, response as never, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "already sent" }));
    expect(response.status).not.toHaveBeenCalled();
  });
});
