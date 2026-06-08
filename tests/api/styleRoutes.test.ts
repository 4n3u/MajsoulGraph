import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createApp } from "../../server/src/index";
import { clearAmaeKoromoCache } from "../../server/src/services/amaeKoromo";

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

const rawStyleStats = {
  "和牌率": 0.32,
  "放铳率": 0.09,
  "副露率": 0.41,
  "立直率": 0.18,
  "默听率": 0.1,
  "平均打点": 7200.9,
  "和了巡数": 11.8,
  "平均铳点": 5100.2,
  "流听率": 0.47,
  "立直巡目": 9.7,
  "先制率": 0.84,
  "追立率": 0.16
};

function makeRecords(count: number, newestStartTime: number): Array<{ uuid: string; startTime: number }> {
  return Array.from({ length: count }, (_, index) => ({
    uuid: `game-${index + 1}`,
    startTime: newestStartTime - index
  }));
}

describe("player style API route", () => {
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

  test("returns processed style analysis from the four-player extended stats endpoint", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-06-09T00:00:00.000Z"));
    const upstreamFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 123, nickname: "Tester", latest_timestamp: 1710000000 }]), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(rawStyleStats), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );
    vi.stubGlobal("fetch", upstreamFetch);

    const response = await getJson("/api/player-style?nickname=Tester");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      player: { id: 123, nickname: "Tester" },
      processed: {
        horyuRate: 0.32,
        averageScore: 7200,
        avgHoryuTurn: 11
      },
      point: {
        x: expect.any(Number),
        y: expect.any(Number)
      },
      analysis: {
        intensity: expect.any(String),
        style: expect.any(String)
      }
    });
    expect(upstreamFetch).toHaveBeenNthCalledWith(
      1,
      "https://5-data.amae-koromo.com/api/v2/pl4/search_player/Tester",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(upstreamFetch).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(
        /^https:\/\/5-data\.amae-koromo\.com\/api\/v2\/pl4\/player_extended_stats\/123\/1262304000000\/178096320\d{4}\?mode=16\.12\.9&tag=$/
      ),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  test("uses the oldest fetched record as the lower bound when count is supplied", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-06-09T00:00:00.000Z"));
    const upstreamFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 456, nickname: "Counted", latest_timestamp: 1710000123 }]), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { uuid: "newer", startTime: 1700000500 },
            { uuid: "oldest", startTime: 1700000000 }
          ]),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(rawStyleStats), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );
    vi.stubGlobal("fetch", upstreamFetch);

    const response = await getJson("/api/player-style?nickname=Counted&sameName=0&count=2");

    expect(response.status).toBe(200);
    expect(upstreamFetch).toHaveBeenNthCalledWith(
      2,
      "https://5-data.amae-koromo.com/api/v2/pl4/player_records/456/1710000123999/1262304000000?limit=2&mode=16.12.9&descending=true&tag=",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(upstreamFetch).toHaveBeenNthCalledWith(
      3,
      "https://5-data.amae-koromo.com/api/v2/pl4/player_extended_stats/456/1700000000000/1780963200000?mode=16.12.9&tag=",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  test("bounds count=500 record lookup to one 500-record page and uses the 500th record", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-06-09T00:00:00.000Z"));
    const firstPage = makeRecords(500, 1700001000);
    const upstreamFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 789, nickname: "FiveHundred", latest_timestamp: 1710000999 }]), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(firstPage), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ uuid: "too-old", startTime: 1600000000 }]), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(rawStyleStats), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );
    vi.stubGlobal("fetch", upstreamFetch);

    const response = await getJson("/api/player-style?nickname=FiveHundred&count=500");

    expect(response.status).toBe(200);
    expect(upstreamFetch).toHaveBeenCalledTimes(3);
    expect(upstreamFetch).toHaveBeenNthCalledWith(
      2,
      "https://5-data.amae-koromo.com/api/v2/pl4/player_records/789/1710000999999/1262304000000?limit=500&mode=16.12.9&descending=true&tag=",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(upstreamFetch).toHaveBeenNthCalledWith(
      3,
      "https://5-data.amae-koromo.com/api/v2/pl4/player_extended_stats/789/1700000501000/1780963200000?mode=16.12.9&tag=",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  test("collects count=501 with bounded pages and uses the 501st record", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-06-09T00:00:00.000Z"));
    const firstPage = makeRecords(500, 1700001000);
    const secondPage = [{ uuid: "game-501", startTime: 1700000500 }];
    const upstreamFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 790, nickname: "FiveOhOne", latest_timestamp: 1710000999 }]), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(firstPage), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(secondPage), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(rawStyleStats), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );
    vi.stubGlobal("fetch", upstreamFetch);

    const response = await getJson("/api/player-style?nickname=FiveOhOne&count=501");

    expect(response.status).toBe(200);
    expect(upstreamFetch).toHaveBeenCalledTimes(4);
    expect(upstreamFetch).toHaveBeenNthCalledWith(
      2,
      "https://5-data.amae-koromo.com/api/v2/pl4/player_records/790/1710000999999/1262304000000?limit=500&mode=16.12.9&descending=true&tag=",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(upstreamFetch).toHaveBeenNthCalledWith(
      3,
      "https://5-data.amae-koromo.com/api/v2/pl4/player_records/790/1700000500999/1262304000000?limit=1&mode=16.12.9&descending=true&tag=",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(upstreamFetch).toHaveBeenNthCalledWith(
      4,
      "https://5-data.amae-koromo.com/api/v2/pl4/player_extended_stats/790/1700000500000/1780963200000?mode=16.12.9&tag=",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  test("returns player_not_found when the same-name index is out of range", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ id: 123, nickname: "Tester", latest_timestamp: 1710000000 }]), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
    );

    const response = await getJson("/api/player-style?nickname=Tester&sameName=2");

    expect(response).toEqual({
      status: 404,
      body: {
        error: {
          code: "player_not_found",
          message: "Player not found"
        }
      }
    });
  });

  test("returns bad_input for unsafe same-name indexes", async () => {
    const response = await getJson("/api/player-style?nickname=Tester&sameName=9007199254740992");

    expect(response).toEqual({
      status: 400,
      body: {
        error: {
          code: "bad_input",
          message: "sameName must be a safe non-negative integer"
        }
      }
    });
  });

  test("returns player_not_found when latestTimestamp is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ id: 123, nickname: "Tester" }]), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
    );

    const response = await getJson("/api/player-style?nickname=Tester");

    expect(response).toEqual({
      status: 404,
      body: {
        error: {
          code: "player_not_found",
          message: "Player latest timestamp not found"
        }
      }
    });
  });

  test("returns player_not_found when latestTimestamp is not a safe integer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ id: 123, nickname: "Tester", latest_timestamp: 9007199254740992 }]), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
    );

    const response = await getJson("/api/player-style?nickname=Tester");

    expect(response).toEqual({
      status: 404,
      body: {
        error: {
          code: "player_not_found",
          message: "Player latest timestamp not found"
        }
      }
    });
  });

  test("returns no_records when the count boundary record has an unsafe startTime", async () => {
    const upstreamFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 123, nickname: "Tester", latest_timestamp: 1710000000 }]), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ uuid: "bad", startTime: 9007199254740992 }]), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );
    vi.stubGlobal("fetch", upstreamFetch);

    const response = await getJson("/api/player-style?nickname=Tester&count=1");

    expect(response).toEqual({
      status: 404,
      body: {
        error: {
          code: "no_records",
          message: "No valid records found"
        }
      }
    });
  });
});
