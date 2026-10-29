import { useState } from "react";
import { Tabs } from "@base-ui/react/tabs";
import { ToolCredit } from "../../components/ToolCredit";
import {
  SERVER_REGIONS,
  type ServerEndpoint,
  type ServerRegionId
} from "./data";
import {
  emptyServerResult,
  useServerStatus,
  type ServerMeasureStatus,
  type ServerResult
} from "./useServerStatus";

function formatMs(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return "—";
  if (ms < 1_000) return `${Math.round(ms)} ms`;
  return `${(ms / 1_000).toFixed(2)} s`;
}

function statusLabel(status: ServerMeasureStatus): string {
  switch (status) {
    case "online":
      return "정상";
    case "slow":
      return "느림";
    case "offline":
      return "오프라인";
    case "unavailable":
      return "측정 불가";
    case "testing":
      return "측정 중";
    default:
      return "대기";
  }
}

function statusClass(status: ServerMeasureStatus): string {
  switch (status) {
    case "online":
      return "is-online";
    case "slow":
      return "is-slow";
    case "offline":
      return "is-offline";
    case "unavailable":
      return "is-unavailable";
    case "testing":
      return "is-testing";
    default:
      return "is-idle";
  }
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) {
    return <span className="server-status-empty">—</span>;
  }

  const width = 96;
  const height = 24;
  const padding = 2;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const flat = max === min;
  const range = max - min || 1;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  const points = values.map((value, index) => {
    const x =
      values.length === 1
        ? width / 2
        : padding + (index / (values.length - 1)) * usableWidth;
    const y = flat
      ? height / 2
      : padding + (1 - (value - min) / range) * usableHeight;
    return [x, y] as const;
  });

  const path = points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const last = points.at(-1);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {last ? <circle cx={last[0]} cy={last[1]} r="1.5" fill="currentColor" /> : null}
    </svg>
  );
}

function resultFor(endpoint: ServerEndpoint, results: Record<string, ServerResult>): ServerResult {
  return results[endpoint.id] ?? emptyServerResult(endpoint);
}

export function ServerStatus() {
  const [regionId, setRegionId] = useState<ServerRegionId>("en-kr");
  const results = useServerStatus(regionId);
  const region = SERVER_REGIONS.find((item) => item.id === regionId) ?? SERVER_REGIONS[0]!;

  const rows = region.endpoints.map((endpoint) => ({
    endpoint,
    result: resultFor(endpoint, results)
  }));

  return (
    <section className="tool-card server-status" aria-labelledby="server-status-title">
      <div className="tool-card-header">
        <h2 id="server-status-title">서버 상태</h2>
      </div>

      <Tabs.Root
        value={regionId}
        onValueChange={(value) => {
          if (typeof value === "string") setRegionId(value as ServerRegionId);
        }}
      >
        <Tabs.List className="server-region-tabs" aria-label="서버 지역">
          {SERVER_REGIONS.map((item) => (
            <Tabs.Tab className="server-region-tab" key={item.id} value={item.id}>
              {item.label}
            </Tabs.Tab>
          ))}
          <Tabs.Indicator className="server-region-tab-indicator" />
        </Tabs.List>

        {SERVER_REGIONS.map((item) => (
          <Tabs.Panel className="server-region-panel" key={item.id} value={item.id}>
            {item.id === regionId ? (
              <>
                <div className="server-status-table-wrap">
                  <table className="server-status-table">
                    <thead>
                      <tr>
                        <th scope="col">서버</th>
                        <th scope="col">상태</th>
                        <th scope="col">HTTP RTT</th>
                        <th scope="col">추세</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ endpoint, result }) => (
                        <tr key={endpoint.id}>
                          <td>
                            <div className="server-status-name">
                              <strong>{endpoint.name}</strong>
                              <span className="server-status-host">{endpoint.host}</span>
                              <span className="server-status-meta">
                                {endpoint.cloud} · {endpoint.location}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`server-status-state ${statusClass(result.status)}`}
                              title={result.error}
                            >
                              <span className="server-status-dot" aria-hidden="true" />
                              {statusLabel(result.status)}
                            </span>
                          </td>
                          <td className="server-status-latency">{formatMs(result.ms)}</td>
                          <td className="server-status-trend">
                            <Sparkline values={result.samples} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </Tabs.Panel>
        ))}
      </Tabs.Root>

      <ToolCredit />
    </section>
  );
}
