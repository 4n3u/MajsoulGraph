import { Router } from "express";
import { getSniperAnalysisResponse } from "../api/sniper";

export const sniperRouter = Router();

sniperRouter.get("/sniper-analysis", async (request, response) => {
  response.json(await getSniperAnalysisResponse(request.query));
});
