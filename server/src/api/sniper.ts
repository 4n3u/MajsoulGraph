import { analyzeSniperRecords } from "@shared/sniperAnalysis";
import { fetchPlayerRecords } from "../services/amaeKoromo";
import { ApiError } from "./errors";
import { getQueryValue, type QuerySource } from "./query";

const fourPlayerGameModes = "16,15,12,11,9,8";
const defaultThresholdSeconds = 30;

function parsePositiveSafeInteger(value: unknown, name: string): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new ApiError(400, "bad_input", `${name} must be a positive integer`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new ApiError(400, "bad_input", `${name} must be a positive integer`);
  }

  return parsed;
}

function parseThresholdSeconds(value: unknown): number {
  if (value === undefined || value === "") return defaultThresholdSeconds;
  return parsePositiveSafeInteger(value, "thresholdSeconds");
}

export async function getSniperAnalysisResponse(query: QuerySource): Promise<unknown> {
  const targetOneId = parsePositiveSafeInteger(getQueryValue(query, "targetOneId"), "targetOneId");
  const targetOneLatestTimestamp = parsePositiveSafeInteger(
    getQueryValue(query, "targetOneLatestTimestamp"),
    "targetOneLatestTimestamp"
  );
  const targetTwoId = parsePositiveSafeInteger(getQueryValue(query, "targetTwoId"), "targetTwoId");
  const targetTwoLatestTimestamp = parsePositiveSafeInteger(
    getQueryValue(query, "targetTwoLatestTimestamp"),
    "targetTwoLatestTimestamp"
  );
  const thresholdSeconds = parseThresholdSeconds(getQueryValue(query, "thresholdSeconds"));

  if (targetOneId === targetTwoId) {
    throw new ApiError(400, "bad_input", "targetOneId and targetTwoId must be different");
  }

  const [targetOneRecords, targetTwoRecords] = await Promise.all([
    fetchPlayerRecords("pl4", targetOneId, targetOneLatestTimestamp, fourPlayerGameModes),
    fetchPlayerRecords("pl4", targetTwoId, targetTwoLatestTimestamp, fourPlayerGameModes)
  ]);

  return analyzeSniperRecords(targetOneRecords, targetTwoRecords, targetTwoId, thresholdSeconds);
}
