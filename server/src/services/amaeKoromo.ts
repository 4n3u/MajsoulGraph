import { ApiError } from "../routes/errors";

type Mode = "pl4" | "pl3";

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

type UpstreamPlayer = {
  id: number;
  nickname: string;
  latest_timestamp?: number;
};

export type PlayerSearchResult = {
  id: number;
  nickname: string;
  latestTimestamp: number | undefined;
};

type PlayerRecordPlayer = {
  accountId: number;
  gradingScore: number;
  level: number;
  score: number;
  [key: string]: unknown;
};

type PlayerRecord = {
  endTime: number;
  modeId: number;
  players: PlayerRecordPlayer[];
  startTime: number;
  [key: string]: unknown;
};

const cache = new Map<string, CacheEntry>();
const cacheTtlMs = 60_000;
const maxCacheEntries = 100;
const requestTimeoutMs = 10_000;

function apiBase(mode: Mode): string {
  return `https://5-data.amae-koromo.com/api/v2/${mode}/`;
}

function requireText(value: unknown, name: string): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiError(400, "bad_input", `${name} is required`);
  }

  return value.trim();
}

function upstreamShapeError(): ApiError {
  return new ApiError(502, "upstream_error", "Amae-Koromo request failed");
}

function requirePositiveSafeIntegerText(value: unknown, name: string): string {
  const text = requireText(value, name);
  if (!/^\d+$/.test(text)) {
    throw new ApiError(400, "bad_input", `${name} must be a positive integer`);
  }

  const numberValue = Number(text);
  if (!Number.isSafeInteger(numberValue) || numberValue <= 0) {
    throw new ApiError(400, "bad_input", `${name} must be a positive integer`);
  }

  return String(numberValue);
}

function requireGameModesText(value: unknown): string {
  const text = requireText(value, "gameModes");
  const commaModeList = /^\d{1,3}(?:,\d{1,3})*$/.test(text);
  const dottedMode = /^\d{1,3}(?:\.\d{1,3})*$/.test(text);
  const tokenCount = text.split(/[,.]/).length;

  if ((!commaModeList && !dottedMode) || tokenCount > 12 || text.length > 64) {
    throw new ApiError(400, "bad_input", "gameModes must be a bounded numeric mode list");
  }

  return text;
}

function assertPlayerSearchResult(value: unknown): UpstreamPlayer {
  if (typeof value !== "object" || value === null) throw upstreamShapeError();
  const player = value as Partial<UpstreamPlayer>;
  const id = player.id;
  const nickname = player.nickname;
  const latestTimestamp = player.latest_timestamp;

  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0 || typeof nickname !== "string") {
    throw upstreamShapeError();
  }

  if (
    latestTimestamp !== undefined &&
    (typeof latestTimestamp !== "number" || !Number.isSafeInteger(latestTimestamp))
  ) {
    throw upstreamShapeError();
  }

  return {
    id,
    nickname,
    latest_timestamp: latestTimestamp
  };
}

function assertPlayerSearchResults(value: unknown): UpstreamPlayer[] {
  if (!Array.isArray(value)) throw upstreamShapeError();
  return value.map(assertPlayerSearchResult);
}

function assertPlayerRecords(value: unknown): PlayerRecord[] {
  if (!Array.isArray(value)) throw upstreamShapeError();
  return value.map(assertPlayerRecord);
}

function assertSafeInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw upstreamShapeError();
  }

  return value;
}

function assertFiniteNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw upstreamShapeError();
  }

  return value;
}

function assertPlayerRecordPlayer(value: unknown): PlayerRecordPlayer {
  if (typeof value !== "object" || value === null) throw upstreamShapeError();
  const player = value as Record<string, unknown>;

  return {
    ...player,
    accountId: assertSafeInteger(player.accountId),
    gradingScore: assertFiniteNumber(player.gradingScore),
    level: assertSafeInteger(player.level),
    score: assertFiniteNumber(player.score)
  };
}

function assertPlayerRecord(value: unknown): PlayerRecord {
  if (typeof value !== "object" || value === null) throw upstreamShapeError();
  const record = value as Record<string, unknown>;
  const rawPlayers = record.players;
  if (!Array.isArray(rawPlayers)) throw upstreamShapeError();

  return {
    ...record,
    endTime: assertSafeInteger(record.endTime),
    modeId: assertSafeInteger(record.modeId),
    players: rawPlayers.map(assertPlayerRecordPlayer),
    startTime: assertSafeInteger(record.startTime)
  };
}

function assertNumericRecord(value: unknown): Record<string, number> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw upstreamShapeError();
  const result: Record<string, number> = {};

  for (const [key, rawValue] of Object.entries(value)) {
    if (typeof rawValue === "number") {
      result[key] = assertFiniteNumber(rawValue);
    }
  }

  if (Object.keys(result).length === 0) throw upstreamShapeError();

  return result;
}

function writeCache(url: string, value: unknown, now: number): void {
  if (!cache.has(url) && cache.size >= maxCacheEntries) {
    const oldestUrl = cache.keys().next().value as string | undefined;
    if (oldestUrl) cache.delete(oldestUrl);
  }

  cache.set(url, { value, expiresAt: now + cacheTtlMs });
}

function isAbortError(error: unknown, signal: AbortSignal): boolean {
  return signal.aborted || (error instanceof DOMException && error.name === "AbortError");
}

export function clearAmaeKoromoCache(): void {
  cache.clear();
}

export async function cachedJson<T>(url: string): Promise<T> {
  const cached = cache.get(url);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value as T;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new ApiError(502, "upstream_error", "Amae-Koromo request failed");

    const value = (await response.json()) as T;
    writeCache(url, value, now);
    return value;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (isAbortError(error, controller.signal)) {
      throw new ApiError(504, "upstream_timeout", "Amae-Koromo request timed out");
    }
    throw new ApiError(502, "upstream_error", "Amae-Koromo request failed");
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchPlayer(mode: Mode, nickname: unknown): Promise<PlayerSearchResult[]> {
  const normalizedNickname = requireText(nickname, "nickname");
  const players = assertPlayerSearchResults(
    await cachedJson<unknown>(`${apiBase(mode)}search_player/${encodeURIComponent(normalizedNickname)}`)
  );

  return players.map((player) => ({
    id: player.id,
    nickname: player.nickname,
    latestTimestamp: player.latest_timestamp
  }));
}

export async function fetchPlayerRecords(
  mode: Mode,
  playerId: unknown,
  startTime: unknown,
  gameModes: unknown,
  limit = 500
): Promise<PlayerRecord[]> {
  const normalizedPlayerId = requirePositiveSafeIntegerText(playerId, "playerId");
  const normalizedStartTime = requirePositiveSafeIntegerText(startTime, "startTime");
  const normalizedGameModes = requireGameModesText(gameModes);
  let cursor = Number(normalizedStartTime);

  const records: PlayerRecord[] = [];

  for (let page = 0; page < 100; page += 1) {
    const url =
      `${apiBase(mode)}player_records/${encodeURIComponent(normalizedPlayerId)}/${cursor}999/1262304000000` +
      `?limit=${limit}&mode=${encodeURIComponent(normalizedGameModes)}&descending=true&tag=`;
    const games = assertPlayerRecords(await cachedJson<unknown>(url));
    records.push(...games);

    const lastGame = games.at(-1);
    if (games.length < limit || limit < 500) break;
    const lastStartTime = lastGame?.startTime;
    if (typeof lastStartTime !== "number" || !Number.isSafeInteger(lastStartTime)) throw upstreamShapeError();
    cursor = lastStartTime - 1;
  }

  return records;
}

export async function fetchPlayerRecordsPage(
  mode: Mode,
  playerId: unknown,
  startTime: unknown,
  gameModes: unknown,
  limit: unknown
): Promise<PlayerRecord[]> {
  const normalizedPlayerId = requirePositiveSafeIntegerText(playerId, "playerId");
  const normalizedStartTime = requirePositiveSafeIntegerText(startTime, "startTime");
  const normalizedGameModes = requireGameModesText(gameModes);
  const normalizedLimit = requirePositiveSafeIntegerText(limit, "limit");
  const cursor = Number(normalizedStartTime);
  const pageLimit = Number(normalizedLimit);

  if (pageLimit > 500) {
    throw new ApiError(400, "bad_input", "limit must be a positive integer up to 500");
  }

  const url =
    `${apiBase(mode)}player_records/${encodeURIComponent(normalizedPlayerId)}/${cursor}999/1262304000000` +
    `?limit=${pageLimit}&mode=${encodeURIComponent(normalizedGameModes)}&descending=true&tag=`;

  return assertPlayerRecords(await cachedJson<unknown>(url));
}

export async function fetchPlayerExtendedStats(
  playerId: unknown,
  from: unknown,
  to: unknown,
  gameMode = "16.12.9"
): Promise<Record<string, number>> {
  const normalizedPlayerId = requireText(playerId, "playerId");
  const normalizedFrom = requireText(from, "from");
  const normalizedTo = requireText(to, "to");
  const normalizedGameMode = requireText(gameMode, "gameMode");

  return assertNumericRecord(
    await cachedJson<unknown>(
      `${apiBase("pl4")}player_extended_stats/${encodeURIComponent(normalizedPlayerId)}/` +
        `${encodeURIComponent(normalizedFrom)}/${encodeURIComponent(normalizedTo)}` +
        `?mode=${encodeURIComponent(normalizedGameMode)}&tag=`
    )
  );
}
