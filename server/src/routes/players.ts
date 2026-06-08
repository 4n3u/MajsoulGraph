import { Router } from "express";
import { fetchPlayerRecords, searchPlayer } from "../services/amaeKoromo";
import { assertMode } from "./errors";

export const playersRouter = Router();

playersRouter.get("/search-player", async (request, response) => {
  const mode = assertMode(request.query.mode);
  const players = await searchPlayer(mode, request.query.nickname);
  response.json({ players });
});

playersRouter.get("/player-records", async (request, response) => {
  const mode = assertMode(request.query.mode);
  const records = await fetchPlayerRecords(
    mode,
    request.query.playerId,
    request.query.startTime,
    request.query.gameModes
  );
  response.json({ records });
});
