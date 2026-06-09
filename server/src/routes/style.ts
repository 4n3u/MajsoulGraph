import { Router } from "express";
import { getPlayerStyleResponse } from "../api/style";

export const styleRouter = Router();

styleRouter.get("/", async (request, response) => {
  response.json(await getPlayerStyleResponse(request.query));
});
