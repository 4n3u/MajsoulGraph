import { useState } from "react";
import { Tabs } from "@base-ui/react/tabs";
import { HandImageGenerator } from "../features/HandImageGenerator";
import { PaipuConverter } from "../features/PaipuConverter";
import { PointTrendGraph } from "../features/PointTrendGraph";
import { ToolPlaceholder } from "./ToolPlaceholder";
import { useMediaQuery } from "./useMediaQuery";

type ToolId = "points" | "style" | "hand" | "paipu";

const tools: Array<{ id: ToolId; label: string; note: string }> = [
  {
    id: "points",
    label: "포인트 추이 그래프",
    note: "대국 기록을 기반으로 포인트 변화를 시각화하는 기능은 이후 작업에서 구현됩니다."
  },
  {
    id: "style",
    label: "사마 스타일 분석",
    note: "플레이 스타일과 경향을 분석하는 기능은 이후 작업에서 구현됩니다."
  },
  {
    id: "hand",
    label: "손패 이미지 생성",
    note: "손패 이미지 생성 기능은 이후 작업에서 구현됩니다."
  },
  {
    id: "paipu",
    label: "패보 주소 변환",
    note: "패보 주소 변환 기능은 이후 작업에서 구현됩니다."
  }
];

function renderTool(tool: (typeof tools)[number]) {
  if (tool.id === "points") {
    return <PointTrendGraph />;
  }

  if (tool.id === "hand") {
    return <HandImageGenerator />;
  }

  if (tool.id === "paipu") {
    return <PaipuConverter />;
  }

  return <ToolPlaceholder title={tool.label} description={tool.note} />;
}

export function AppShell() {
  const [selectedTool, setSelectedTool] = useState<ToolId>("points");
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <Tabs.Root
      className="app-shell"
      value={selectedTool}
      onValueChange={(value) => setSelectedTool(value as ToolId)}
      orientation={isMobile ? "horizontal" : "vertical"}
    >
      <header className="app-header">
        <div>
          <p className="app-kicker">Mahjong utility workspace</p>
          <h1>Majsoul Graph</h1>
        </div>
      </header>

      <div className="app-layout">
        <aside className="tool-nav" aria-label="도구">
          <div className="nav-heading">도구 선택</div>
          <Tabs.List className="tool-tabs" aria-label="도구 선택">
            {tools.map((tool) => (
              <Tabs.Tab className="tool-tab" key={tool.id} value={tool.id}>
                {tool.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </aside>

        <main className="workspace">
          {tools.map((tool) => (
            <Tabs.Panel className="tool-panel" key={tool.id} value={tool.id}>
              {renderTool(tool)}
            </Tabs.Panel>
          ))}
        </main>
      </div>
    </Tabs.Root>
  );
}
