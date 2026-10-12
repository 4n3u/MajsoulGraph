import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createPointTimelineProcessor,
  type GameRecord,
  type PointTimelineInput,
  type RankPeriodSummary,
  type TimelineResult
} from "@shared/pointTimeline";
import { gameModeLabels, type GameModeId } from "@shared/mahjongModes";
import { EChart, type EChartsType } from "../charts/EChart";
import { buildPointChartOptions } from "../charts/pointChartOptions";
import {
  buildRankPieChartOptions,
  calculateRankDistribution,
  extractDataZoomRange
} from "../charts/rankPieChartOptions";
import { Button, ProgressBar, SelectField, TextField } from "../components/BaseControls";
import { useErrorToast } from "../components/ErrorToasts";
import { PlayerAccountPicker, type PlayerAccount } from "../components/PlayerAccountPicker";
import { ToolCredit } from "../components/ToolCredit";

type ModeLabel = "사마" | "삼마";

type ModeConfig = {
  apiMode: "pl4" | "pl3";
  gameModes: string;
  initialLevel: number;
  historyLevel: number;
};

type SearchPlayerResult = {
  id: number;
  level?: {
    delta?: number;
    id: number;
    score: number;
  };
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

const pointCredits = [
  { label: "@iriscatx", href: "https://x.com/iriscatx" },
  { label: "@AmaeKoromo_MajS", href: "https://amae-koromo.sapk.ch/" }
] as const;

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
    .map(([modeId, count]) => {
      const parsedModeId = Number(modeId) as GameModeId;
      return `${gameModeLabels[parsedModeId] ?? modeId} ${count}판`;
    })
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
  const [playerCandidates, setPlayerCandidates] = useState<PlayerAccount[]>([]);
  const [progress, setProgress] = useState<LoadingProgress | null>(null);
  const [timeline, setTimeline] = useState<TimelineResult | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ startIndex: number; endIndex: number } | null>(null);
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

  const rankDistribution = useMemo(() => {
    if (!timeline || timeline.summary.gameCount === 0) return null;
    const range = selectedRange ?? { startIndex: 1, endIndex: timeline.summary.gameCount };
    return calculateRankDistribution(timeline.points, range.startIndex, range.endIndex);
  }, [timeline, selectedRange]);

  const pieChartOptions = useMemo(() => {
    if (!rankDistribution) return null;
    return buildRankPieChartOptions(rankDistribution, mode === "삼마");
  }, [rankDistribution, mode]);

  const handleDataZoom = useCallback(
    (event: unknown) => {
      if (!timeline || timeline.summary.gameCount === 0) return;
      const nextRange = extractDataZoomRange(event, timeline.summary.gameCount);
      setSelectedRange((prev) => {
        if (prev && prev.startIndex === nextRange.startIndex && prev.endIndex === nextRange.endIndex) {
          return prev;
        }
        return nextRange;
      });
    },
    [timeline]
  );

  const pointChartEvents = useMemo(
    () => ({
      datazoom: handleDataZoom
    }),
    [handleDataZoom]
  );

  const pointChartInstanceRef = useRef<EChartsType | null>(null);

  const handlePeriodClick = useCallback(
    (period: RankPeriodSummary) => {
      if (!timeline) return;

      const isCurrent =
        selectedRange?.startIndex === period.indexStart &&
        selectedRange?.endIndex === period.indexEnd;

      if (isCurrent) {
        setSelectedRange({ startIndex: 1, endIndex: timeline.summary.gameCount });
        pointChartInstanceRef.current?.dispatchAction({
          type: "dataZoom",
          startValue: 0,
          endValue: timeline.summary.gameCount
        });
      } else {
        setSelectedRange({ startIndex: period.indexStart, endIndex: period.indexEnd });
        pointChartInstanceRef.current?.dispatchAction({
          type: "dataZoom",
          startValue: Math.max(0, period.indexStart - 1),
          endValue: period.indexEnd
        });
      }
    },
    [timeline, selectedRange]
  );

  async function analyzePlayer(player: PlayerAccount, config: ModeConfig) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const isCurrentRequest = () => requestIdRef.current === requestId && !abortController.signal.aborted;

    try {
      setTimeline(null);
      setSelectedRange(null);
      setPlayerCandidates([]);

      if (typeof player.latestTimestamp !== "number") {
        throw new Error("최근 대국 시간이 없는 플레이어입니다.");
      }

      setProgress({ label: "패보를 불러오는 중", value: null });
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

      setProgress({ label: "패보 분석 준비 중", value: null });
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
        setSelectedRange({ startIndex: 1, endIndex: nextTimeline.summary.gameCount });
        setProgress(null);
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    } catch (analysisError) {
      if (isCurrentRequest()) {
        setTimeline(null);
        setSelectedRange(null);
        setProgress(null);
        showError(analysisError instanceof Error ? analysisError.message : "포인트 추이 그래프를 생성할 수 없습니다.");
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedNickname = nickname.trim();
    setTimeline(null);
    setSelectedRange(null);
    setPlayerCandidates([]);

    if (!trimmedNickname) {
      setProgress(null);
      showError("닉네임을 입력해주세요.");
      return;
    }

    const config = modeConfig[mode];
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

      const players = searchBody.players ?? [];

      if (players.length === 0) {
        throw new Error("플레이어를 찾을 수 없습니다.");
      }

      if (players.length > 1) {
        setProgress(null);
        setPlayerCandidates(players);
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
        return;
      }

      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      await analyzePlayer(players[0]!, config);
    } catch (submitError) {
      if (isCurrentRequest()) {
        setTimeline(null);
        setSelectedRange(null);
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
            onValueChange={(value) => {
              setNickname(value);
              setPlayerCandidates([]);
            }}
            disabled={isLoading}
            placeholder="닉네임"
            type="text"
            value={nickname}
          />
          <SelectField
            id="point-mode-select"
            label="모드"
            name="mode"
            onValueChange={(value) => {
              setMode(value);
              setPlayerCandidates([]);
            }}
            options={modeOptions}
            disabled={isLoading}
            value={mode}
          />
          <Button className="primary-button" type="submit" disabled={isLoading}>
            그래프 생성
          </Button>
        </div>
      </form>

      <PlayerAccountPicker
        disabled={isLoading}
        onSelect={(player) => {
          void analyzePlayer(player, modeConfig[mode]);
        }}
        players={playerCandidates}
      />

      {progress ? (
        <ProgressBar label={progress.label} value={progress.value} />
      ) : null}

      {timeline && chartOptions ? (
        <section className="point-results" aria-label="포인트 추이 결과">
          <EChart
            className="point-chart"
            option={chartOptions}
            ariaLabel="포인트 추이 그래프"
            onEvents={pointChartEvents}
            onChartReady={(chart) => {
              pointChartInstanceRef.current = chart;
            }}
          />

          {rankDistribution && pieChartOptions ? (
            <section className="rank-distribution" aria-labelledby="rank-distribution-title">
              <div className="rank-distribution-header">
                <h3 id="rank-distribution-title">순위 분포</h3>
                <span className="rank-distribution-range">
                  {rankDistribution.startIndex}전 ~ {rankDistribution.endIndex}전 (총 {rankDistribution.totalGames}판)
                </span>
              </div>

              <div className="rank-distribution-body">
                <EChart className="rank-pie-chart" option={pieChartOptions} ariaLabel="순위 분포 원형 그래프" />

                <div className="rank-distribution-stats">
                  <div className="rank-stat-item">
                    <span className="rank-stat-label">평균 순위</span>
                    <strong className="rank-stat-value">
                      {rankDistribution.totalGames > 0 ? `${rankDistribution.averageRank.toFixed(3)}위` : "-"}
                    </strong>
                  </div>
                  <div className="rank-stat-item">
                    <span className="rank-stat-label">1위</span>
                    <strong className="rank-stat-value">
                      {rankDistribution.rankCounts[1]}판 ({rankDistribution.totalGames > 0 ? ((rankDistribution.rankCounts[1] / rankDistribution.totalGames) * 100).toFixed(1) : "0.0"}%)
                    </strong>
                  </div>
                  <div className="rank-stat-item">
                    <span className="rank-stat-label">2위</span>
                    <strong className="rank-stat-value">
                      {rankDistribution.rankCounts[2]}판 ({rankDistribution.totalGames > 0 ? ((rankDistribution.rankCounts[2] / rankDistribution.totalGames) * 100).toFixed(1) : "0.0"}%)
                    </strong>
                  </div>
                  <div className="rank-stat-item">
                    <span className="rank-stat-label">3위</span>
                    <strong className="rank-stat-value">
                      {rankDistribution.rankCounts[3]}판 ({rankDistribution.totalGames > 0 ? ((rankDistribution.rankCounts[3] / rankDistribution.totalGames) * 100).toFixed(1) : "0.0"}%)
                    </strong>
                  </div>
                  {mode !== "삼마" ? (
                    <div className="rank-stat-item">
                      <span className="rank-stat-label">4위</span>
                      <strong className="rank-stat-value">
                        {rankDistribution.rankCounts[4]}판 ({rankDistribution.totalGames > 0 ? ((rankDistribution.rankCounts[4] / rankDistribution.totalGames) * 100).toFixed(1) : "0.0"}%)
                      </strong>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          <section className="rank-history" aria-labelledby="rank-history-title">
            <h3 id="rank-history-title">단위전 이력</h3>
            <div className="rank-history-list">
              {timeline.rankPeriods.map((period) => {
                const isSelected =
                  selectedRange !== null &&
                  selectedRange.startIndex === period.indexStart &&
                  selectedRange.endIndex === period.indexEnd;

                return (
                  <div
                    className={`rank-history-row ${isSelected ? "is-selected" : ""}`}
                    key={`${period.level}-${period.indexStart}-${period.startTime}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${period.levelLabel} 기간 대국 범위 선택`}
                    aria-pressed={isSelected}
                    onClick={() => handlePeriodClick(period)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handlePeriodClick(period);
                      }
                    }}
                  >
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
                );
              })}
            </div>
          </section>
        </section>
      ) : null}

      <ToolCredit links={pointCredits} />
    </section>
  );
}
