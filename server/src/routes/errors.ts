import type { ErrorRequestHandler } from "express";
import { ApiError } from "../api/errors";

export { ApiError, assertMode } from "../api/errors";
export type { ApiErrorCode } from "../api/errors";

export const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ApiError) {
    response.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }

  response.status(500).json({ error: { code: "internal_error", message: "Internal server error" } });
};
