import type { ErrorRequestHandler } from "express";

export type ApiErrorCode = "bad_input" | "internal_error" | "not_found" | "upstream_error" | "upstream_timeout";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;

  constructor(status: number, code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function assertMode(value: unknown): "pl4" | "pl3" {
  if (value === "pl4" || value === "pl3") return value;
  throw new ApiError(400, "bad_input", "mode must be pl4 or pl3");
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ApiError) {
    response.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }

  response.status(500).json({ error: { code: "internal_error", message: "Internal server error" } });
};
