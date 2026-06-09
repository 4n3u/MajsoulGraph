import { Router } from "express";
import { analyzeStyle, calculateCoordinates, getStandardizedStats, processStats } from "@shared/styleAnalysis";
import { ApiError } from "./errors";
import { fetchPlayerExtendedStats, fetchPlayerRecordsPage, searchPlayer } from "../services/amaeKoromo";

export const styleRouter = Router();

const defaultFrom = 1_262_304_000_000;
const maxStyleRecordCount = 50_000;
const maxStyleRecordPages = 100;
const styleGameMode = "16.12.9";

function parseSameName(value: unknown): number {
  if (value === undefined || value === "") return 0;
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new ApiError(400, "bad_input", "sameName must be a non-negative integer");
  }

  const sameName = Number(value);
  if (!Number.isSafeInteger(sameName)) {
    throw new ApiError(400, "bad_input", "sameName must be a safe non-negative integer");
  }

  return sameName;
}

function parseCount(value: unknown): number | undefined {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new ApiError(400, "bad_input", "count must be a positive integer");
  }

  const count = Number(value);
  if (!Number.isSafeInteger(count) || count <= 0) {
    throw new ApiError(400, "bad_input", "count must be a positive integer");
  }

  if (count > maxStyleRecordCount) {
    throw new ApiError(400, "bad_input", `count must be at most ${maxStyleRecordCount}`);
  }

  return count;
}

function parsePositiveSafeInteger(value: unknown, name: string): number | undefined {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new ApiError(400, "bad_input", `${name} must be a positive integer`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new ApiError(400, "bad_input", `${name} must be a positive integer`);
  }

  return parsed;
}

function isSafeTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

async function fetchRecentStyleRecords(
  playerId: number,
  latestTimestamp: number,
  count: number
): Promise<Array<{ startTime?: number; [key: string]: unknown }>> {
  const records: Array<{ startTime?: number; [key: string]: unknown }> = [];
  let cursor = latestTimestamp;
  let pages = 0;

  while (records.length < count && pages < maxStyleRecordPages) {
    pages += 1;
    const pageLimit = Math.min(500, count - records.length);
    const page = await fetchPlayerRecordsPage("pl4", playerId, cursor, styleGameMode, pageLimit);
    if (page.length === 0) break;

    records.push(...page.slice(0, count - records.length));

    if (records.length < count) {
      const lastPageRecord = page.at(-1);
      if (!isSafeTimestamp(lastPageRecord?.startTime)) {
        throw new ApiError(404, "no_records", "No valid records found");
      }

      cursor = lastPageRecord.startTime - 1;
    }
  }

  return records;
}

styleRouter.get("/", async (request, response, next) => {
  try {
    const nickname = request.query.nickname;
    if (typeof nickname !== "string" || nickname.trim() === "") {
      throw new ApiError(400, "bad_input", "nickname is required");
    }

    const sameName = parseSameName(request.query.sameName);
    const count = parseCount(request.query.count);
    const explicitPlayerId = parsePositiveSafeInteger(request.query.playerId, "playerId");
    const explicitLatestTimestamp = parsePositiveSafeInteger(request.query.latestTimestamp, "latestTimestamp");
    let player: { id: number; latestTimestamp: number | undefined; nickname: string } | undefined;

    if (explicitPlayerId !== undefined || explicitLatestTimestamp !== undefined) {
      if (explicitPlayerId === undefined || explicitLatestTimestamp === undefined) {
        throw new ApiError(400, "bad_input", "playerId and latestTimestamp must be supplied together");
      }

      player = {
        id: explicitPlayerId,
        latestTimestamp: explicitLatestTimestamp,
        nickname: nickname.trim()
      };
    } else {
      const players = await searchPlayer("pl4", nickname);
      player = players[sameName];
    }

    if (!player) {
      throw new ApiError(404, "player_not_found", "Player not found");
    }

    if (!isSafeTimestamp(player.latestTimestamp)) {
      throw new ApiError(404, "player_not_found", "Player latest timestamp not found");
    }

    let from = defaultFrom;
    if (count !== undefined) {
      const records = await fetchRecentStyleRecords(player.id, player.latestTimestamp, count);
      const lastRecord = records.at(-1);

      if (!lastRecord) {
        throw new ApiError(404, "no_records", "No records found");
      }

      if (!isSafeTimestamp(lastRecord.startTime)) {
        throw new ApiError(404, "no_records", "No valid records found");
      }

      from = Number(`${lastRecord.startTime}000`);
    }

    const to = Date.now();
    const rawStats = await fetchPlayerExtendedStats(player.id, from, to, styleGameMode);
    const processed = processStats(rawStats);
    const point = calculateCoordinates(getStandardizedStats(processed));
    const analysis = analyzeStyle(point.x, point.y);

    response.json({
      player: {
        id: player.id,
        nickname: player.nickname
      },
      processed,
      point,
      analysis
    });
  } catch (error) {
    next(error);
  }
});
