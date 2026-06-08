import { FormEvent, useRef, useState } from "react";
import { parsePaiGroups, type ParsedTile } from "@shared/handParser";
import { Button, CheckboxField, TextField } from "../components/BaseControls";

type TileRenderData = ParsedTile & {
  image: HTMLImageElement;
};

const defaultHand = "p111m109s9 S1s11 z0z55z0";
const padding = 10;
const groupGap = 40;

function assetBasePath(useNumberedTiles: boolean) {
  const directory = useNumberedTiles ? "pai_img_num" : "pai_img";
  return `/assets/img/${directory}`;
}

async function loadTileImage(src: string) {
  const image = new Image();
  image.decoding = "async";
  image.src = src;

  if (typeof image.decode === "function") {
    try {
      await image.decode();
      return image;
    } catch (error) {
      if (image.complete && image.naturalWidth > 0) {
        return image;
      }

      throw error;
    }
  }

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
  });

  return image;
}

function tileFootprint(tile: TileRenderData) {
  return {
    width: tile.rotate ? tile.image.naturalHeight : tile.image.naturalWidth,
    height: tile.rotate ? tile.image.naturalWidth : tile.image.naturalHeight
  };
}

function drawTile(context: CanvasRenderingContext2D, tile: TileRenderData, x: number, y: number) {
  const footprint = tileFootprint(tile);

  if (!tile.rotate) {
    context.drawImage(tile.image, x, y);
    return;
  }

  context.save();
  context.translate(x + footprint.width / 2, y + footprint.height / 2);
  context.rotate(-Math.PI / 2);
  context.drawImage(tile.image, -tile.image.naturalWidth / 2, -tile.image.naturalHeight / 2);
  context.restore();
}

function describeParseError(error: unknown) {
  if (!(error instanceof Error)) {
    return "패 입력을 확인해 주세요.";
  }

  if (error.message.includes("maximum 18")) {
    return "손패는 최대 18개까지만 입력할 수 있습니다.";
  }

  if (error.message.includes("Invalid tile group")) {
    return "패 형식이 올바르지 않습니다. 예: m123 p456 s789 z123";
  }

  if (error.message.includes("Unsupported tile suit")) {
    return "지원하지 않는 패 종류가 포함되어 있습니다. m, p, s, z만 사용할 수 있습니다.";
  }

  if (error.message.includes("Unsupported tile digit")) {
    return "자패는 0부터 7까지만 입력할 수 있습니다.";
  }

  return "패 입력을 확인해 주세요.";
}

export function HandImageGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [input, setInput] = useState(defaultHand);
  const [useNumberedTiles, setUseNumberedTiles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPreview, setHasPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  async function renderHand(groups: ParsedTile[][]) {
    const basePath = assetBasePath(useNumberedTiles);
    const loadedGroups: TileRenderData[][] = await Promise.all(
      groups.map((group) =>
        Promise.all(
          group.map(async (tile) => {
            const src = `${basePath}/${tile.fileName}`;
            try {
              const image = await loadTileImage(src);
              return {
                ...tile,
                image
              };
            } catch {
              throw new Error(`missing asset: ${tile.fileName}`);
            }
          })
        )
      )
    );

    const groupWidths = loadedGroups.map((group) =>
      group.reduce((sum, tile) => sum + tileFootprint(tile).width, 0)
    );
    const maxTileHeight = loadedGroups.reduce((maxHeight, group) => {
      const groupHeight = group.reduce(
        (height, tile) => Math.max(height, tileFootprint(tile).height),
        0
      );
      return Math.max(maxHeight, groupHeight);
    }, 0);
    const contentWidth =
      groupWidths.reduce((sum, width) => sum + width, 0) +
      Math.max(0, loadedGroups.length - 1) * groupGap;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      throw new Error("canvas unavailable");
    }

    canvas.width = contentWidth + padding * 2;
    canvas.height = maxTileHeight + padding * 2;
    context.clearRect(0, 0, canvas.width, canvas.height);

    let x = padding;
    for (const group of loadedGroups) {
      for (const tile of group) {
        const footprint = tileFootprint(tile);
        const y = padding + maxTileHeight - footprint.height;
        drawTile(context, tile, x, y);
        x += footprint.width;
      }
      x += groupGap;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setHasPreview(false);
    setIsGenerating(true);

    try {
      const groups = parsePaiGroups(input);
      const tileCount = groups.reduce((sum, group) => sum + group.length, 0);

      if (tileCount === 0) {
        setError("생성할 패를 입력해 주세요.");
        return;
      }

      await renderHand(groups);
      setHasPreview(true);
    } catch (caughtError) {
      if (caughtError instanceof Error && caughtError.message.startsWith("missing asset:")) {
        setError("패 이미지 파일을 찾을 수 없습니다. 입력한 패를 확인해 주세요.");
        return;
      }

      setError(describeParseError(caughtError));
    } finally {
      setIsGenerating(false);
    }
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const link = document.createElement("a");
    link.download = "hand.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <section className="tool-card hand-generator" aria-labelledby="hand-generator-title">
      <div className="tool-card-header">
        <h2 id="hand-generator-title">손패 이미지 생성</h2>
      </div>

      <form className="hand-generator-form" onSubmit={handleSubmit}>
        <div className="input-row">
          <TextField
            id="hand-input"
            label="패 입력"
            onValueChange={setInput}
            placeholder="m123 p456 s789 z123"
            type="text"
            value={input}
          />
          <Button className="primary-button" type="submit" disabled={isGenerating}>
            {isGenerating ? "생성 중" : "이미지 생성"}
          </Button>
        </div>

        <CheckboxField
          checked={useNumberedTiles}
          label="숫자 표기"
          name="numbered-tiles"
          onCheckedChange={setUseNumberedTiles}
        />
      </form>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="hand-preview-panel" hidden={!hasPreview}>
        <div className="result-header">
          <Button className="secondary-button" type="button" onClick={handleDownload}>
            이미지 다운로드
          </Button>
        </div>
        <canvas ref={canvasRef} aria-label="생성된 손패 이미지" />
      </div>
    </section>
  );
}
