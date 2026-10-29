import { useEffect, useState } from "react";
import {
  ALL_SERVER_ENDPOINTS,
  SERVER_REGIONS,
  type ServerEndpoint,
  type ServerRegionId
} from "./data";

export type ServerMeasureStatus =
  | "idle"
  | "testing"
  | "online"
  | "slow"
  | "offline"
  | "unavailable";

export type ServerResult = {
  status: ServerMeasureStatus;
  ms: number | null;
  updatedAt: number | null;
  samples: number[];
  error?: string;
};

export type ServerResults = Record<string, ServerResult>;

const POLL_INTERVAL_MS = 1_000;
const MAX_SAMPLES = 60;
const HTTP_TIMEOUT_MS = 8_000;
const SLOW_THRESHOLD_MS = 400;

export function emptyServerResult(endpoint: ServerEndpoint): ServerResult {
  return {
    status: endpoint.measurable ? "idle" : "unavailable",
    ms: null,
    updatedAt: null,
    samples: []
  };
}

function initialResults(): ServerResults {
  return Object.fromEntries(
    ALL_SERVER_ENDPOINTS.map((endpoint) => [endpoint.id, emptyServerResult(endpoint)])
  );
}

async function measureEndpoint(endpoint: ServerEndpoint, signal: AbortSignal): Promise<number> {
  if (!endpoint.httpUrl) {
    throw new Error("브라우저에서 측정할 수 없는 서버입니다.");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => {
    controller.abort(new DOMException("HTTP timeout", "TimeoutError"));
  }, HTTP_TIMEOUT_MS);

  const forwardAbort = () => controller.abort(signal.reason);
  signal.addEventListener("abort", forwardAbort, { once: true });

  const started = performance.now();
  try {
    const url = new URL(endpoint.httpUrl);
    url.searchParams.set("rv", `${Date.now()}-${Math.random().toString(36).slice(2)}`);

    await fetch(url.toString(), {
      mode: endpoint.fetchMode,
      cache: "no-store",
      credentials: "omit",
      redirect: "follow",
      signal: controller.signal
    });

    return performance.now() - started;
  } finally {
    window.clearTimeout(timeout);
    signal.removeEventListener("abort", forwardAbort);
  }
}

export function useServerStatus(regionId: ServerRegionId): ServerResults {
  const [results, setResults] = useState<ServerResults>(initialResults);

  useEffect(() => {
    const region = SERVER_REGIONS.find((item) => item.id === regionId);
    if (!region) return;

    const controller = new AbortController();
    const inFlight = new Set<string>();

    const tick = () => {
      if (controller.signal.aborted || document.visibilityState !== "visible") return;

      for (const endpoint of region.endpoints) {
        if (!endpoint.measurable) {
          setResults((previous) => {
            const current = previous[endpoint.id];
            if (current?.status === "unavailable") return previous;
            return {
              ...previous,
              [endpoint.id]: {
                ...(current ?? emptyServerResult(endpoint)),
                status: "unavailable"
              }
            };
          });
          continue;
        }

        if (inFlight.has(endpoint.id)) continue;
        inFlight.add(endpoint.id);

        void measureEndpoint(endpoint, controller.signal)
          .then((ms) => {
            if (controller.signal.aborted) return;

            const status = ms <= SLOW_THRESHOLD_MS ? "online" : "slow";
            setResults((previous) => {
              const current = previous[endpoint.id] ?? emptyServerResult(endpoint);
              const samples = [...current.samples, ms].slice(-MAX_SAMPLES);
              return {
                ...previous,
                [endpoint.id]: {
                  status,
                  ms,
                  updatedAt: Date.now(),
                  samples
                }
              };
            });
          })
          .catch((error: unknown) => {
            if (controller.signal.aborted) return;

            const message = error instanceof Error ? error.message : String(error);
            setResults((previous) => {
              const current = previous[endpoint.id] ?? emptyServerResult(endpoint);
              return {
                ...previous,
                [endpoint.id]: {
                  status: "offline",
                  ms: null,
                  updatedAt: Date.now(),
                  samples: current.samples,
                  error: message
                }
              };
            });
          })
          .finally(() => {
            inFlight.delete(endpoint.id);
          });
      }
    };

    tick();
    const timer = window.setInterval(tick, POLL_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      controller.abort();
    };
  }, [regionId]);

  return results;
}
