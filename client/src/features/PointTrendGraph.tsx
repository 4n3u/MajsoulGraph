import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  createPointTimelineProcessor,
  type GameRecord,
  type PointTimelineInput,
  type TimelineResult
} from "@shared/pointTimeline";
import { EChart } from "../charts/EChart";
import { buildPointChartOptions } from "../charts/pointChartOptions";
import { Button, ProgressBar, SelectField, TextField } from "../components/BaseControls";
import { useErrorToast } from "../components/ErrorToasts";

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

type LoadingProgress = {
  label: string;
  value: number | null;
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

const modeLabels: Record<number, string> = {
  8: "4금동",
  9: "4금반",
  11: "4옥동",
  12: "4옥반",
  15: "4왕동",
  16: "4왕반",
  21: "3금동",
  22: "3금반",
  23: "3옥동",
  24: "3옥반",
  25: "3왕동",
  26: "3왕반"
};

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

async function nextAnimationFrame(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function formatAnalysisLabel(current: number, total: number): string {
  return `패보를 분석하는 중... (${current}/${total})`;
}

function progressValue(current: number, total: number): number {
  if (total <= 0) return 100;
  return Math.round((current / total) * 100);
}

function formatModeCounts(modeCounts: Partial<Record<number, number>>): string {
  return Object.entries(modeCounts)
    .map(([modeId, count]) => `${modeLabels[Number(modeId)] ?? modeId} ${count}판`)
    .join(", ");
}

function formatRankBreakdown(rankCounts: Record<1 | 2 | 3 | 4, number>): string {
  return `${rankCounts[1]} +${rankCounts[2]} +${rankCounts[3]} +${rankCounts[4]}`;
}

async function buildPointTimelineWithProgress(
  input: PointTimelineInput,
  setProgress: (progress: LoadingProgress) => void,
  isCurrentRequest: () => boolean
): Promise<TimelineResult> {
  const processor = createPointTimelineProcessor(input);
  const batchSize = Math.max(1, Math.ceil(processor.total / 40));

  setProgress({
    label: formatAnalysisLabel(0, processor.total),
    value: 0
  });
  await nextFrame();

  if (!isCurrentRequest()) {
    throw new DOMException("Point timeline analysis was cancelled.", "AbortError");
  }

  while (processor.current < processor.total) {
    for (let index = 0; index < batchSize && processor.current < processor.total; index += 1) {
      processor.processNext();
    }

    setProgress({
      label: formatAnalysisLabel(processor.current, processor.total),
      value: progressValue(processor.current, processor.total)
    });

    await nextAnimationFrame();

    if (!isCurrentRequest()) {
      throw new DOMException("Point timeline analysis was cancelled.", "AbortError");
    }
  }

  return processor.finish();
}

export function PointTrendGraph() {
  const [nickname, setNickname] = useState("");
  const [mode, setMode] = useState<ModeLabel>("사마");
  const [sameName, setSameName] = useState<SameNameIndex>("0");
  const [progress, setProgress] = useState<LoadingProgress | null>(null);
  const [timeline, setTimeline] = useState<TimelineResult | null>(null);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const showError = useErrorToast();
  const isLoading = Boolean(progress);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      abortControllerRef.current?.abort();
    };
  }, []);

  const chartOptions = useMemo(() => {
    return timeline ? buildPointChartOptions(timeline) : null;
  }, [timeline]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedNickname = nickname.trim();
    setTimeline(null);

    if (!trimmedNickname) {
      setProgress(null);
      showError("닉네임을 입력해주세요.");
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
      setProgress({ label: "닉네임 검색 중", value: null });
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
        setProgress({ label: "패보를 불러오는 중", value: null });
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
        setProgress({ label: "패보 분석 준비 중", value: null });
      }
      await nextFrame();
      if (!isCurrentRequest()) return;

      let nextTimeline: TimelineResult;

      try {
        nextTimeline = await buildPointTimelineWithProgress(
          {
            recordsDescending: recordsBody.records,
            targetAccountId: player.id,
            initialLevel: config.initialLevel,
            historyLevel: config.historyLevel
          },
          setProgress,
          isCurrentRequest
        );
      } catch {
        throw new Error("패보를 분석할 수 없습니다. 대국 기록을 확인해 주세요.");
      }

      if (isCurrentRequest()) {
        setTimeline(nextTimeline);
        setProgress(null);
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    } catch (submitError) {
      if (isCurrentRequest()) {
        setTimeline(null);
        setProgress(null);
        showError(submitError instanceof Error ? submitError.message : "포인트 추이 그래프를 생성할 수 없습니다.");
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

      {progress ? (
        <ProgressBar label={progress.label} value={progress.value} />
      ) : null}

      {timeline && chartOptions ? (
        <section className="point-results" aria-label="포인트 추이 결과">
          <EChart className="point-chart" option={chartOptions} ariaLabel="포인트 추이 그래프" />

          <section className="rank-history" aria-labelledby="rank-history-title">
            <h3 id="rank-history-title">단위전 이력</h3>
            <div className="rank-history-list">
              {timeline.rankPeriods.map((period) => (
                <div className="rank-history-row" key={`${period.level}-${period.indexStart}-${period.startTime}`}>
                  <span>
                    {formatDate(period.startTime)} - {formatDate(period.endTime)} ({period.periodDays}일)
                  </span>
                  <strong>
                    {period.levelLabel} ({formatRankBreakdown(period.rankCounts)})={period.gameCount}판
                  </strong>
                  <span>평균 순위 {period.averageRank.toFixed(3)}</span>
                  <span>최고 pt {period.highPoint}</span>
                  <span>최저 pt {period.lowPoint}</span>
                  <span>{formatModeCounts(period.modeCounts)}</span>
                </div>
              ))}
            </div>
          </section>
        </section>
      ) : null}
    </section>
  );
}
