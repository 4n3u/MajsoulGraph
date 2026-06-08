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

type PlayerRecord = {
  startTime?: number;
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
  const players = await cachedJson<UpstreamPlayer[]>(
    `${apiBase(mode)}search_player/${encodeURIComponent(normalizedNickname)}`
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
  const normalizedPlayerId = requireText(playerId, "playerId");
  const normalizedStartTime = requireText(startTime, "startTime");
  const normalizedGameModes = requireText(gameModes, "gameModes");
  let cursor = Number(normalizedStartTime);

  if (!Number.isFinite(cursor)) throw new ApiError(400, "bad_input", "startTime is required");

  const records: PlayerRecord[] = [];

  for (let page = 0; page < 100; page += 1) {
    const url =
      `${apiBase(mode)}player_records/${encodeURIComponent(normalizedPlayerId)}/${cursor}999/1262304000000` +
      `?limit=${limit}&mode=${encodeURIComponent(normalizedGameModes)}&descending=true&tag=`;
    const games = await cachedJson<PlayerRecord[]>(url);
    records.push(...games);

    const lastGame = games.at(-1);
    if (games.length < limit || limit < 500 || !lastGame?.startTime) break;
    cursor = lastGame.startTime - 1;
  }

  return records;
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

  return cachedJson<Record<string, number>>(
    `${apiBase("pl4")}player_extended_stats/${encodeURIComponent(normalizedPlayerId)}/` +
      `${encodeURIComponent(normalizedFrom)}/${encodeURIComponent(normalizedTo)}` +
      `?mode=${encodeURIComponent(normalizedGameMode)}&tag=`
  );
}
