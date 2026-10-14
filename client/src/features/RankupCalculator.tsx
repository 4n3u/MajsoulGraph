import { FormEvent, useMemo, useState } from "react";
import {
  calculateRankupConditions,
  DAN_OPTIONS,
  type MahjongType,
  type RankConditionResult,
  type RankupCalculationResult
} from "@shared/rankup";
import { Button, SelectField, TextField } from "../components/BaseControls";
import { useErrorToast } from "../components/ErrorToasts";

const mahjongTypeOptions = [
  { label: "사마", value: "four" as const },
  { label: "삼마", value: "three" as const }
];

const danSelectOptions = DAN_OPTIONS.map((item) => ({
  label: item.name,
  value: item.id
}));

function formatCondition(condition: RankConditionResult) {
  if (condition.type === "unconditional") {
    return <span className="rankup-unconditional">확정 승단</span>;
  }
  if (condition.type === "impossible") {
    return <span className="rankup-impossible" title="70,000점 초과 (달성 불가)">-</span>;
  }
  return <span className="rankup-score">{condition.requiredScore.toLocaleString()}점 이상</span>;
}

export function RankupCalculator() {
  const [mahjongType, setMahjongType] = useState<MahjongType>("four");
  const [danId, setDanId] = useState<string>("master1");
  const [pointsInput, setPointsInput] = useState<string>("");
  const [result, setResult] = useState<RankupCalculationResult | null>(null);
  const showError = useErrorToast();

  const currentDan = useMemo(
    () => DAN_OPTIONS.find((item) => item.id === danId) ?? DAN_OPTIONS[9]!,
    [danId]
  );
  const maxPoints = currentDan.necessaryPoint;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = pointsInput.trim();
    const rawNum = trimmed === "" ? 0 : Number(trimmed);

    if (trimmed !== "" && (!/^\d+$/.test(trimmed) || !Number.isSafeInteger(rawNum))) {
      showError("반각 숫자로 입력해 주세요.");
      return;
    }

    if (rawNum < 0 || rawNum > maxPoints) {
      showError(`0~${maxPoints.toLocaleString()} 사이의 숫자를 입력해 주세요.`);
      return;
    }

    const calculated = calculateRankupConditions({
      mahjongType,
      danId,
      currentPoints: rawNum
    });

    setResult(calculated);
  }

  return (
    <section className="tool-card rankup-calculator" aria-labelledby="rankup-calculator-title">
      <div className="tool-card-header">
        <h2 id="rankup-calculator-title">승단 조건</h2>
      </div>

      <form className="rankup-form" noValidate onSubmit={handleSubmit}>
        <div className="rankup-form-grid">
          <SelectField
            id="rankup-type-select"
            label="모드"
            name="mahjongType"
            onValueChange={(val) => {
              setMahjongType(val as MahjongType);
              setResult(null);
            }}
            options={mahjongTypeOptions}
            value={mahjongType}
          />
          <SelectField
            id="rankup-dan-select"
            label="단위"
            name="dan"
            onValueChange={(val) => {
              setDanId(val);
              setResult(null);
            }}
            options={danSelectOptions}
            value={danId}
          />
          <TextField
            id="rankup-points-input"
            label="현재 포인트"
            labelAddon={
              <span className="rankup-max-addon">
                / {maxPoints.toLocaleString()} pt
              </span>
            }
            name="points"
            onValueChange={(val) => {
              setPointsInput(val);
            }}
            placeholder="0"
            inputMode="numeric"
            value={pointsInput}
          />
          <div className="rankup-button-group">
            <Button className="primary-button" type="submit">
              계산하기
            </Button>
          </div>
        </div>
      </form>

      {result ? (
        <section className="rankup-results" aria-label="승단 조건 계산 결과">
          <div className="rankup-summary-box">
            <p className="rankup-summary">
              <strong>{result.dan.name}</strong> {result.currentPoints.toLocaleString()} / {result.maxPoints.toLocaleString()} pt에서 승단하려면{" "}
              <span className="rankup-needed-highlight">{result.neededPoints.toLocaleString()} pt</span> 필요합니다.
            </p>
          </div>

          <div className="rankup-table-wrap">
            <table className="rankup-table">
              <thead>
                <tr>
                  <th scope="col">탁</th>
                  <th scope="col">대국 조건</th>
                  <th scope="col">1위 승단 조건</th>
                  <th scope="col">2위 승단 조건</th>
                </tr>
              </thead>
              <tbody>
                {result.conditions.map((row) => (
                  <tr key={`${row.stage}-${row.gameMode}`}>
                    <td className="rankup-stage-cell">{row.stage}</td>
                    <td className="rankup-mode-cell">{row.gameMode}</td>
                    <td className="rankup-condition-cell">{formatCondition(row.firstPlace)}</td>
                    <td className="rankup-condition-cell">{formatCondition(row.secondPlace)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </section>
  );
}
