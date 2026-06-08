import { FormEvent, useState } from "react";
import {
  decodePaipuUuid,
  encodePaipuUuid,
  mat2Account,
  mat2Friend,
  zone
} from "@shared/paipu";
import { Button, TextField } from "../components/BaseControls";

type ConversionResult = {
  accountId: number;
  convertedUrl: string;
  friendId: number;
  region: ReturnType<typeof zone>;
  title: string;
};

const legacyUuidTailPattern = "[0-9a-z]{8}-[0-9a-z]{8}";
const standardUuidTailPattern = "[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}";
const ordinaryUuidPattern = new RegExp(`^\\d{6}-(?:${legacyUuidTailPattern}|${standardUuidTailPattern})$`);
const anonymousUuidPattern = new RegExp(`^[0-9a-z]{6}-(?:${legacyUuidTailPattern}|${standardUuidTailPattern})$`);
const paipuPattern = /^([^_]+)_a(\d+)(?:_2)?$/;

function convertPaipuUrl(rawValue: string): ConversionResult {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    throw new Error("패보 주소를 입력해 주세요.");
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("올바른 패보 주소를 입력해 주세요.");
  }

  const paipu = url.searchParams.get("paipu");
  const parsed = paipu?.match(paipuPattern);

  if (!paipu || !parsed) {
    throw new Error("paipu= 값과 _a 매치 ID가 포함된 패보 주소를 입력해 주세요.");
  }

  const uuid = parsed[1]!;
  const matchIdValue = parsed[2]!;
  const matchId = Number(matchIdValue);

  if (!Number.isSafeInteger(matchId) || matchId <= 0) {
    throw new Error("패보 주소의 매치 ID를 확인해 주세요.");
  }

  const isOrdinaryUrl = ordinaryUuidPattern.test(uuid);
  const decodedUuid = isOrdinaryUrl ? uuid : decodePaipuUuid(uuid);

  if (!isOrdinaryUrl && (!anonymousUuidPattern.test(uuid) || !ordinaryUuidPattern.test(decodedUuid))) {
    throw new Error("패보 주소의 UUID 형식을 확인해 주세요.");
  }

  const accountId = mat2Account(matchId);

  if (!Number.isSafeInteger(accountId) || accountId <= 0) {
    throw new Error("패보 주소의 매치 ID를 확인해 주세요.");
  }

  const convertedUuid = isOrdinaryUrl ? encodePaipuUuid(uuid) : decodedUuid;
  const convertedPaipu = `${convertedUuid}_a${matchId}${isOrdinaryUrl ? "_2" : ""}`;

  url.searchParams.set("paipu", convertedPaipu);

  return {
    accountId,
    convertedUrl: url.toString(),
    friendId: mat2Friend(matchId),
    region: zone(accountId),
    title: isOrdinaryUrl ? "변환된 익명 패보 주소" : "변환된 일반 패보 주소"
  };
}

export function PaipuConverter() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [copyStatus, setCopyStatus] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCopyStatus("");

    try {
      setResult(convertPaipuUrl(input));
      setError("");
    } catch (conversionError) {
      setResult(null);
      setError(conversionError instanceof Error ? conversionError.message : "패보 주소를 변환할 수 없습니다.");
    }
  }

  async function copyConvertedUrl() {
    if (!result) {
      return;
    }

    try {
      await navigator.clipboard.writeText(result.convertedUrl);
      setCopyStatus("복사됨");
    } catch {
      setCopyStatus("복사 실패");
    }
  }

  return (
    <section className="tool-card paipu-converter" aria-labelledby="paipu-converter-title">
      <div className="tool-card-header">
        <h2 id="paipu-converter-title">패보 주소 변환</h2>
      </div>

      <form className="converter-form" noValidate onSubmit={handleSubmit}>
        <div className="input-row">
          <TextField
            id="paipu-url-input"
            label="패보 주소 입력"
            inputMode="url"
            name="paipu-url"
            onValueChange={setInput}
            placeholder="https://game.mahjongsoul.com/?paipu=..."
            type="text"
            value={input}
          />
          <Button className="primary-button" type="submit">
            변환
          </Button>
        </div>
      </form>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <section className="result-panel" aria-labelledby="paipu-result-title">
          <div className="result-header">
            <h3 id="paipu-result-title">{result.title}</h3>
            <Button className="secondary-button" type="button" onClick={copyConvertedUrl}>
              복사
            </Button>
          </div>
          <textarea
            aria-label="변환된 패보 주소"
            className="result-url"
            readOnly
            rows={3}
            value={result.convertedUrl}
          />
          <dl className="result-meta">
            <div>
              <dt>계정 ID</dt>
              <dd>{result.accountId}</dd>
            </div>
            <div>
              <dt>친구 ID</dt>
              <dd>{result.friendId}</dd>
            </div>
            <div>
              <dt>서버 지역</dt>
              <dd>{result.region}</dd>
            </div>
          </dl>
          {copyStatus ? (
            <p className="copy-status" role="status">
              {copyStatus}
            </p>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
