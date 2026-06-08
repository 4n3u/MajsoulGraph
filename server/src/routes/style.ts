import { Router } from "express";
import { analyzeStyle, calculateCoordinates, getStandardizedStats, processStats } from "@shared/styleAnalysis";
import { ApiError } from "./errors";
import { fetchPlayerExtendedStats, fetchPlayerRecords, searchPlayer } from "../services/amaeKoromo";

export const styleRouter = Router();

const defaultFrom = 1_262_304_000_000;
const styleGameMode = "16.12.9";

function parseSameName(value: unknown): number {
  if (value === undefined || value === "") return 0;
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new ApiError(400, "bad_input", "sameName must be a non-negative integer");
  }

  return Number(value);
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

  return count;
}

styleRouter.get("/", async (request, response, next) => {
  try {
    const nickname = request.query.nickname;
    if (typeof nickname !== "string" || nickname.trim() === "") {
      throw new ApiError(400, "bad_input", "nickname is required");
    }

    const sameName = parseSameName(request.query.sameName);
    const count = parseCount(request.query.count);
    const players = await searchPlayer("pl4", nickname);
    const player = players[sameName];

    if (!player) {
      throw new ApiError(404, "player_not_found", "Player not found");
    }

    if (typeof player.latestTimestamp !== "number") {
      throw new ApiError(404, "player_not_found", "Player latest timestamp not found");
    }

    let from = defaultFrom;
    if (count !== undefined) {
      const records = await fetchPlayerRecords("pl4", player.id, player.latestTimestamp, styleGameMode, count);
      const lastRecord = records.at(-1);

      if (!lastRecord?.startTime) {
        throw new ApiError(404, "no_records", "No records found");
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
