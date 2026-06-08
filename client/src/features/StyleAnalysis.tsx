import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ProcessedStyleStats, StyleIntensity, StyleLabel } from "@shared/styleAnalysis";
import { EChart } from "../charts/EChart";
import { buildStyleChartOptions } from "../charts/styleChartOptions";
import { Button, ProgressBar, SelectField, TextField } from "../components/BaseControls";

type SameNameIndex = "0" | "1" | "2";

type StyleResponse = {
  player: {
    id: number;
    nickname: string;
  };
  processed: ProcessedStyleStats;
  point: {
    x: number;
    y: number;
  };
  analysis: {
    intensity: StyleIntensity;
    style: StyleLabel;
    distance: number;
    slope: number;
  };
};

const statLabels: Array<{ key: keyof ProcessedStyleStats; label: string }> = [
  { key: "horyuRate", label: "화료율" },
  { key: "houjuRate", label: "방총율" },
  { key: "furoRate", label: "후로율" },
  { key: "riichiRate", label: "리치율" },
  { key: "damaRate", label: "다마율" },
  { key: "averageScore", label: "평균 화료 타점" },
  { key: "avgHoryuTurn", label: "평균 화료순" },
  { key: "avgHoujuScore", label: "평균 방총 타점" },
  { key: "ryukyokuRate", label: "유국 텐파이율" },
  { key: "riichiTurn", label: "리치순" },
  { key: "riichiFirstRate", label: "리치 선제율" },
  { key: "riichiChaseRate", label: "리치 추격률" }
];

const sameNameOptions: ReadonlyArray<{ label: string; value: SameNameIndex }> = [
  { label: "0", value: "0" },
  { label: "1", value: "1" },
  { label: "2", value: "2" }
];

async function parseStyleResponse(response: Response): Promise<StyleResponse> {
  let body: StyleResponse | null = null;

  try {
    body = (await response.json()) as StyleResponse;
  } catch {
    body = null;
  }

  if (!response.ok || !body) {
    throw new Error("스타일 분석에 실패했습니다.");
  }

  return body;
}

async function fetchStyle(url: string, signal: AbortSignal): Promise<Response> {
  try {
    return await fetch(url, { signal });
  } catch {
    throw new Error("스타일 분석에 실패했습니다.");
  }
}

function formatPoint(value: number): string {
  return value.toFixed(2);
}

function formatStat(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function StyleAnalysis() {
  const [nickname, setNickname] = useState("");
  const [count, setCount] = useState("");
  const [sameName, setSameName] = useState<SameNameIndex>("0");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<StyleResponse | null>(null);
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
    return result
      ? buildStyleChartOptions({
          x: result.point.x,
          y: result.point.y,
          nickname: result.player.nickname
        })
      : null;
  }, [result]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedNickname = nickname.trim();
    const trimmedCount = count.trim();
    setError("");
    setResult(null);

    if (!trimmedNickname) {
      setStatus("");
      setError("닉네임을 입력해주세요.");
      return;
    }

    const parsedCount = Number(trimmedCount);
    if (trimmedCount && (!/^\d+$/.test(trimmedCount) || !Number.isSafeInteger(parsedCount) || parsedCount <= 0)) {
      setStatus("");
      setError("대국 수는 양의 정수로 입력해주세요.");
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const isCurrentRequest = () => requestIdRef.current === requestId && !abortController.signal.aborted;

    try {
      setStatus("loading");
      const params = new URLSearchParams({
        nickname: trimmedNickname,
        sameName
      });
      if (trimmedCount) {
        params.set("count", trimmedCount);
      }

      const body = await parseStyleResponse(
        await fetchStyle(`/api/player-style?${params.toString()}`, abortController.signal)
      );

      if (isCurrentRequest()) {
        setResult(body);
        setStatus("");
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    } catch (submitError) {
      if (isCurrentRequest()) {
        setResult(null);
        setStatus("");
        setError(submitError instanceof Error ? submitError.message : "스타일 분석에 실패했습니다.");
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    }
  }

  return (
    <section className="tool-card style-analysis" aria-labelledby="style-analysis-title">
      <div className="tool-card-header">
        <h2 id="style-analysis-title">사마 스타일 분석</h2>
      </div>

      <form className="style-analysis-form" noValidate onSubmit={handleSubmit}>
        <div className="style-form-grid">
          <TextField
            id="style-nickname-input"
            label="작혼 닉네임"
            name="nickname"
            onValueChange={setNickname}
            disabled={isLoading}
            placeholder="닉네임"
            type="text"
            value={nickname}
          />
          <TextField
            id="style-count-input"
            label="대국 수"
            name="count"
            onValueChange={setCount}
            disabled={isLoading}
            inputMode="numeric"
            min="1"
            placeholder="전체"
            step="1"
            type="number"
            value={count}
          />
          <SelectField
            id="style-same-name-select"
            label="동일 닉네임 구분"
            name="same-name"
            onValueChange={setSameName}
            options={sameNameOptions}
            disabled={isLoading}
            value={sameName}
          />
          <Button className="primary-button" type="submit" disabled={isLoading}>
            스타일 분석
          </Button>
        </div>
      </form>

      {status ? (
        <ProgressBar label="스타일 분석 진행 중" />
      ) : null}

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {result && chartOptions ? (
        <section className="style-results" aria-label="스타일 분석 결과">
          <div className="style-result-head">
            <p className="style-verdict">
              당신은 {result.analysis.intensity} {result.analysis.style}입니다.
            </p>
            <dl className="style-coordinates">
              <div>
                <dt>X 좌표</dt>
                <dd>{formatPoint(result.point.x)}</dd>
              </div>
              <div>
                <dt>Y 좌표</dt>
                <dd>{formatPoint(result.point.y)}</dd>
              </div>
            </dl>
          </div>

          <EChart className="style-chart" option={chartOptions} ariaLabel="스타일 분석 산점도" />

          <dl className="style-stat-list" aria-label="처리된 스타일 통계">
            {statLabels.map((stat) => (
              <div key={stat.key}>
                <dt>{stat.label}</dt>
                <dd>{formatStat(result.processed[stat.key])}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </section>
  );
}
