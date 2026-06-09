import { Router } from "express";
import { getPlayerRecordsResponse, getSearchPlayerResponse } from "../api/players";

export const playersRouter = Router();

playersRouter.get("/search-player", async (request, response) => {
  response.json(await getSearchPlayerResponse(request.query));
});

playersRouter.get("/player-records", async (request, response) => {
  response.json(await getPlayerRecordsResponse(request.query));
});
