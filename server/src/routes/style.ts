import { Router } from "express";

export const styleRouter = Router();

styleRouter.get("/", (_request, response) => {
  response.json({});
});
