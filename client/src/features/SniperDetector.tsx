import { FormEvent, useEffect, useRef, useState } from "react";
import { Button, ProgressBar, TextField } from "../components/BaseControls";
import { useErrorToast } from "../components/ErrorToasts";
import { PlayerAccountPicker, type PlayerAccount } from "../components/PlayerAccountPicker";
import { ToolCredit } from "../components/ToolCredit";

type SearchResponse = { players?: PlayerAccount[] };

type SniperResponse = {
  suspiciousCount: number;
  successfulCount: number;
  matches: Array<{
    startTime: number;
    nearestDifferenceSeconds: number;
    metTargetTwo: boolean;
  }>;
};

const sniperCredits = [{ label: "@AmaeKoromo_MajS", href: "https://amae-koromo.sapk.ch/" }] as const;

async function parseResponse<T>(response: Response, message: string): Promise<T> {
  let body: T | null = null;
  try {
    body = (await response.json()) as T;
  } catch {
    body = null;
  }
  if (!response.ok || !body) throw new Error(message);
  return body;
}

function formatStartTime(timestamp: number): string {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "medium" }).format(
    new Date(timestamp * 1000)
  );
}

export function SniperDetector() {
  const [targetOneNickname, setTargetOneNickname] = useState("");
  const [targetTwoNickname, setTargetTwoNickname] = useState("");
  const [threshold, setThreshold] = useState("30");
  const [targetOneCandidates, setTargetOneCandidates] = useState<PlayerAccount[]>([]);
  const [targetTwoCandidates, setTargetTwoCandidates] = useState<PlayerAccount[]>([]);
  const [targetOne, setTargetOne] = useState<PlayerAccount | null>(null);
  const [targetTwo, setTargetTwo] = useState<PlayerAccount | null>(null);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<SniperResponse | null>(null);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const analyzedKeyRef = useRef("");
  const showError = useErrorToast();
  const isLoading = Boolean(status);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  function resetSelections() {
    analyzedKeyRef.current = "";
    setTargetOneCandidates([]);
    setTargetTwoCandidates([]);
    setTargetOne(null);
    setTargetTwo(null);
    setResult(null);
  }

  function validateThreshold(): number {
    const parsed = Number(threshold.trim());
    if (!/^\d+$/.test(threshold.trim()) || !Number.isSafeInteger(parsed) || parsed <= 0) {
      throw new Error("시간 기준은 양의 정수(초)로 입력해 주세요.");
    }
    return parsed;
  }

  async function analyzePlayers(one: PlayerAccount, two: PlayerAccount, thresholdSeconds: number) {
    if (one.id === two.id) {
      showError("서로 다른 두 계정을 선택해 주세요.");
      return;
    }
    if (typeof one.latestTimestamp !== "number" || typeof two.latestTimestamp !== "number") {
      showError("최근 대국 시간이 없는 계정은 분석할 수 없습니다.");
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setStatus("analyzing");
    setResult(null);

    try {
      const params = new URLSearchParams({
        targetOneId: String(one.id),
        targetOneLatestTimestamp: String(one.latestTimestamp),
        targetTwoId: String(two.id),
        targetTwoLatestTimestamp: String(two.latestTimestamp),
        thresholdSeconds: String(thresholdSeconds)
      });
      const body = await parseResponse<SniperResponse>(
        await fetch(`/api/sniper-analysis?${params.toString()}`, { signal: abortController.signal }),
        "저격 탐지에 실패했습니다."
      );
      if (requestIdRef.current === requestId && !abortController.signal.aborted) setResult(body);
    } catch (error) {
      if (requestIdRef.current === requestId && !abortController.signal.aborted) {
        showError(error instanceof Error ? error.message : "저격 탐지에 실패했습니다.");
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setStatus("");
        if (abortControllerRef.current === abortController) abortControllerRef.current = null;
      }
    }
  }

  useEffect(() => {
    if (!targetOne || !targetTwo || status) return;
    const key = `${targetOne.id}:${targetTwo.id}:${threshold}`;
    if (analyzedKeyRef.current === key) return;
    try {
      const thresholdSeconds = validateThreshold();
      analyzedKeyRef.current = key;
      void analyzePlayers(targetOne, targetTwo, thresholdSeconds);
    } catch (error) {
      showError(error instanceof Error ? error.message : "시간 기준을 확인해 주세요.");
    }
  }, [targetOne, targetTwo]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const oneNickname = targetOneNickname.trim();
    const twoNickname = targetTwoNickname.trim();
    if (!oneNickname || !twoNickname) {
      showError("대상 1과 대상 2의 닉네임을 모두 입력해 주세요.");
      return;
    }
    try {
      validateThreshold();
    } catch (error) {
      showError(error instanceof Error ? error.message : "시간 기준을 확인해 주세요.");
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    resetSelections();
    setStatus("searching");
    try {
      const search = async (nickname: string) =>
        parseResponse<SearchResponse>(
          await fetch(`/api/search-player?${new URLSearchParams({ mode: "pl4", nickname }).toString()}`, {
            signal: abortController.signal
          }),
          "플레이어 검색에 실패했습니다."
        );
      const [oneSearch, twoSearch] = await Promise.all([search(oneNickname), search(twoNickname)]);
      if (requestIdRef.current !== requestId || abortController.signal.aborted) return;
      const onePlayers = oneSearch.players ?? [];
      const twoPlayers = twoSearch.players ?? [];
      if (onePlayers.length === 0 || twoPlayers.length === 0) throw new Error("플레이어를 찾을 수 없습니다.");
      setTargetOneCandidates(onePlayers);
      setTargetTwoCandidates(twoPlayers);
      setTargetOne(onePlayers.length === 1 ? onePlayers[0]! : null);
      setTargetTwo(twoPlayers.length === 1 ? twoPlayers[0]! : null);
      analyzedKeyRef.current = "";
    } catch (error) {
      if (requestIdRef.current === requestId && !abortController.signal.aborted) {
        showError(error instanceof Error ? error.message : "플레이어 검색에 실패했습니다.");
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setStatus("");
        if (abortControllerRef.current === abortController) abortControllerRef.current = null;
      }
    }
  }

  return (
    <section className="tool-card sniper-detector" aria-labelledby="sniper-detector-title">
      <div className="tool-card-header"><h2 id="sniper-detector-title">저격 탐지</h2></div>
      <form className="sniper-form" noValidate onSubmit={handleSubmit}>
        <div className="sniper-form-grid">
          <TextField id="sniper-target-one" label="대상 1 닉네임" name="targetOneNickname" value={targetOneNickname} disabled={isLoading} onValueChange={(value) => { setTargetOneNickname(value); resetSelections(); }} />
          <TextField id="sniper-target-two" label="대상 2 닉네임" name="targetTwoNickname" value={targetTwoNickname} disabled={isLoading} onValueChange={(value) => { setTargetTwoNickname(value); resetSelections(); }} />
          <TextField id="sniper-threshold" label="시간 기준(초)" name="threshold" type="number" min="1" inputMode="numeric" value={threshold} disabled={isLoading} onValueChange={(value) => { setThreshold(value); resetSelections(); }} />
          <Button className="primary-button" type="submit" disabled={isLoading}>탐지 시작</Button>
        </div>
      </form>
      <p className="sniper-caveat">이 결과는 저격을 확정하는 증거가 아니라, 대국 시작 시각을 기계적으로 비교한 참고 정보입니다.</p>
      {targetOneCandidates.length > 1 ? <div className="sniper-picker"><PlayerAccountPicker players={targetOneCandidates} disabled={isLoading} onSelect={setTargetOne} /></div> : null}
      {targetTwoCandidates.length > 1 ? <div className="sniper-picker"><PlayerAccountPicker players={targetTwoCandidates} disabled={isLoading} onSelect={setTargetTwo} /></div> : null}
      {status ? <ProgressBar label="대국 기록을 수집하고 비교하는 중" /> : null}
      {result ? (
        <section className="sniper-results" aria-label="저격 탐지 결과">
          <dl className="sniper-summary">
            <div><dt>동시 시작 의심</dt><dd>{result.suspiciousCount}건</dd></div>
            <div><dt>대상 2 동석</dt><dd>{result.successfulCount}건</dd></div>
          </dl>
          <div className="sniper-table-wrap">
            <table>
              <thead><tr><th>대상 1 시작 시각</th><th>가장 가까운 차이</th><th>대상 2 동석</th></tr></thead>
              <tbody>{result.matches.map((match) => <tr key={`${match.startTime}-${match.nearestDifferenceSeconds}`}><td>{formatStartTime(match.startTime)}</td><td>{match.nearestDifferenceSeconds}초</td><td>{match.metTargetTwo ? "동석" : "미동석"}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      ) : null}
      <ToolCredit links={sniperCredits} />
    </section>
  );
}
