import { fetchPlayerRecords, searchPlayer } from "../services/amaeKoromo";
import { assertMode } from "./errors";
import { getQueryValue, type QuerySource } from "./query";

export async function getSearchPlayerResponse(query: QuerySource): Promise<unknown> {
  const mode = assertMode(getQueryValue(query, "mode"));
  const players = await searchPlayer(mode, getQueryValue(query, "nickname"));

  return { players };
}

export async function getPlayerRecordsResponse(query: QuerySource): Promise<unknown> {
  const mode = assertMode(getQueryValue(query, "mode"));
  const records = await fetchPlayerRecords(
    mode,
    getQueryValue(query, "playerId"),
    getQueryValue(query, "startTime"),
    getQueryValue(query, "gameModes")
  );

  return { records };
}
