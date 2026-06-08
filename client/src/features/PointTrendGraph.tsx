import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { buildPointTimeline, type GameRecord } from "@shared/pointTimeline";
import { EChart } from "../charts/EChart";
import { buildPointChartOptions } from "../charts/pointChartOptions";
import { Button, ProgressBar, SelectField, TextField } from "../components/BaseControls";

type ModeLabel = "사마" | "삼마";
type SameNameIndex = "0" | "1" | "2";

type ModeConfig = {
  apiMode: "pl4" | "pl3";
  gameModes: string;
  initialLevel: number;
  historyLevel: number;
};

type SearchPlayerResult = {
  id: number;
  nickname: string;
  latestTimestamp?: number;
};

type SearchResponse = {
  players?: SearchPlayerResult[];
};

type RecordsResponse = {
  records?: GameRecord[];
};

const modeConfig: Record<ModeLabel, ModeConfig> = {
  사마: {
    apiMode: "pl4",
    gameModes: "16,15,12,11,9,8",
    initialLevel: 10301,
    historyLevel: 10203
  },
  삼마: {
    apiMode: "pl3",
    gameModes: "26,24,22,25,23,21",
    initialLevel: 20301,
    historyLevel: 20203
  }
};

const modeOptions: ReadonlyArray<{ label: string; value: ModeLabel }> = [
  { label: "사마", value: "사마" },
  { label: "삼마", value: "삼마" }
];

const sameNameOptions: ReadonlyArray<{ label: string; value: SameNameIndex }> = [
  { label: "0", value: "0" },
  { label: "1", value: "1" },
  { label: "2", value: "2" }
];

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(timestamp * 1000));
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  let body: T | null = null;

  try {
    body = (await response.json()) as T;
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(fallbackMessage);
  }

  if (!body) {
    throw new Error(fallbackMessage);
  }

  return body;
}

async function fetchOrThrow(url: string, fallbackMessage: string, signal: AbortSignal): Promise<Response> {
  try {
    return await fetch(url, { signal });
  } catch {
    throw new Error(fallbackMessage);
  }
}

async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) => {
    window.setTimeout(() => {
      requestAnimationFrame(() => resolve());
    }, 75);
  });
}

export function PointTrendGraph() {
  const [nickname, setNickname] = useState("");
  const [mode, setMode] = useState<ModeLabel>("사마");
  const [sameName, setSameName] = useState<SameNameIndex>("0");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [timeline, setTimeline] = useState<ReturnType<typeof buildPointTimeline> | null>(null);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isLoading = Boolean(status);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      abortControllerRef.current?.abort();
    };
  }, []);

  const chartOptions = useMemo(() => {
    return timeline ? buildPointChartOptions(timeline.points) : null;
  }, [timeline]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedNickname = nickname.trim();
    setError("");
    setTimeline(null);

    if (!trimmedNickname) {
      setStatus("");
      setError("닉네임을 입력해주세요.");
      return;
    }

    const config = modeConfig[mode];
    const sameNameIndex = Number(sameName);
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const isCurrentRequest = () => requestIdRef.current === requestId && !abortController.signal.aborted;

    try {
      setStatus("loading");
      const searchParams = new URLSearchParams({
        mode: config.apiMode,
        nickname: trimmedNickname
      });
      const searchBody = await parseJsonResponse<SearchResponse>(
        await fetchOrThrow(
          `/api/search-player?${searchParams.toString()}`,
          "닉네임 검색에 실패했습니다.",
          abortController.signal
        ),
        "닉네임 검색에 실패했습니다."
      );

      if (!isCurrentRequest()) return;

      const player = searchBody.players?.[sameNameIndex];

      if (!player) {
        throw new Error("선택한 동일 닉네임 구분의 플레이어를 찾을 수 없습니다.");
      }

      if (typeof player.latestTimestamp !== "number") {
        throw new Error("최근 대국 시간이 없는 플레이어입니다.");
      }

      if (isCurrentRequest()) {
        setStatus("loading");
      }
      const recordsParams = new URLSearchParams({
        mode: config.apiMode,
        playerId: String(player.id),
        startTime: String(player.latestTimestamp),
        gameModes: config.gameModes
      });
      const recordsBody = await parseJsonResponse<RecordsResponse>(
        await fetchOrThrow(
          `/api/player-records?${recordsParams.toString()}`,
          "패보를 불러오지 못했습니다.",
          abortController.signal
        ),
        "패보를 불러오지 못했습니다."
      );

      if (!isCurrentRequest()) return;

      if (!recordsBody.records?.length) {
        throw new Error("분석할 대국 기록이 없습니다.");
      }

      if (isCurrentRequest()) {
        setStatus("loading");
      }
      await nextFrame();
      if (!isCurrentRequest()) return;

      let nextTimeline: ReturnType<typeof buildPointTimeline>;

      try {
        nextTimeline = buildPointTimeline({
          recordsDescending: recordsBody.records,
          targetAccountId: player.id,
          initialLevel: config.initialLevel,
          historyLevel: config.historyLevel
        });
      } catch {
        throw new Error("패보를 분석할 수 없습니다. 대국 기록을 확인해 주세요.");
      }

      if (isCurrentRequest()) {
        setTimeline(nextTimeline);
        setStatus("");
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    } catch (submitError) {
      if (isCurrentRequest()) {
        setTimeline(null);
        setStatus("");
        setError(submitError instanceof Error ? submitError.message : "포인트 추이 그래프를 생성할 수 없습니다.");
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    }
  }

  return (
    <section className="tool-card point-trend" aria-labelledby="point-trend-title">
      <div className="tool-card-header">
        <h2 id="point-trend-title">포인트 추이 그래프</h2>
      </div>

      <form className="point-trend-form" noValidate onSubmit={handleSubmit}>
        <div className="point-form-grid">
          <TextField
            id="point-nickname-input"
            label="작혼 닉네임"
            name="nickname"
            onValueChange={setNickname}
            disabled={isLoading}
            placeholder="닉네임"
            type="text"
            value={nickname}
          />
          <SelectField
            id="point-mode-select"
            label="모드"
            name="mode"
            onValueChange={setMode}
            options={modeOptions}
            disabled={isLoading}
            value={mode}
          />
          <SelectField
            id="point-same-name-select"
            label="동일 닉네임 구분"
            name="same-name"
            onValueChange={setSameName}
            options={sameNameOptions}
            disabled={isLoading}
            value={sameName}
          />
          <Button className="primary-button" type="submit" disabled={isLoading}>
            그래프 생성
          </Button>
        </div>
      </form>

      {status ? (
        <ProgressBar label="포인트 추이 그래프 생성 중" />
      ) : null}

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {timeline && chartOptions ? (
        <section className="point-results" aria-label="포인트 추이 결과">
          <dl className="point-summary">
            <div>
              <dt>대국 수</dt>
              <dd>{timeline.summary.gameCount}</dd>
            </div>
            <div>
              <dt>현재 pt</dt>
              <dd>{timeline.summary.finalPoint}</dd>
            </div>
            <div>
              <dt>최고 pt</dt>
              <dd>{timeline.summary.highPoint}</dd>
            </div>
            <div>
              <dt>최저 pt</dt>
              <dd>{timeline.summary.lowPoint}</dd>
            </div>
            <div>
              <dt>최고 등급</dt>
              <dd>{timeline.summary.highestLevelLabel}</dd>
            </div>
          </dl>

          <EChart className="point-chart" option={chartOptions} ariaLabel="포인트 추이 그래프" />

          <section className="rank-history" aria-labelledby="rank-history-title">
            <h3 id="rank-history-title">최근 등급 기록</h3>
            <div className="rank-history-list">
              {timeline.rankHistory.slice(-6).map((entry) => (
                <div className="rank-history-row" key={`${entry.index}-${entry.startTime}`}>
                  <span>{formatDate(entry.startTime)}</span>
                  <strong>
                    {entry.fromLevelLabel} -&gt; {entry.toLevelLabel}
                  </strong>
                  <span>{entry.pointBefore} pt</span>
                  <span>{entry.pointAfter} pt</span>
                  <span>{entry.rank}위</span>
                </div>
              ))}
            </div>
          </section>
        </section>
      ) : null}
    </section>
  );
}
