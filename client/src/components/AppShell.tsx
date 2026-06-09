import { lazy, Suspense, useEffect, useState } from "react";
import { Tabs } from "@base-ui/react/tabs";
import { ToolPlaceholder } from "./ToolPlaceholder";

type ToolId = "points" | "style" | "hand" | "paipu";

const HandImageGenerator = lazy(() =>
  import("../features/HandImageGenerator").then((module) => ({ default: module.HandImageGenerator }))
);
const PaipuConverter = lazy(() =>
  import("../features/PaipuConverter").then((module) => ({ default: module.PaipuConverter }))
);
const PointTrendGraph = lazy(() =>
  import("../features/PointTrendGraph").then((module) => ({ default: module.PointTrendGraph }))
);
const StyleAnalysis = lazy(() =>
  import("../features/StyleAnalysis").then((module) => ({ default: module.StyleAnalysis }))
);

const tools: Array<{ id: ToolId; label: string; note: string; path: string }> = [
  {
    id: "points",
    label: "포인트 추이 그래프",
    note: "대국 기록을 기반으로 포인트 변화를 시각화하는 기능은 이후 작업에서 구현됩니다.",
    path: "/graph"
  },
  {
    id: "style",
    label: "사마 스타일 분석",
    note: "플레이 스타일과 경향을 분석하는 기능은 이후 작업에서 구현됩니다.",
    path: "/style"
  },
  {
    id: "hand",
    label: "손패 이미지 생성",
    note: "손패 이미지 생성 기능은 이후 작업에서 구현됩니다.",
    path: "/pai-image"
  },
  {
    id: "paipu",
    label: "패보 주소 변환",
    note: "패보 주소 변환 기능은 이후 작업에서 구현됩니다.",
    path: "/pai-pu"
  }
];

const defaultToolId: ToolId = "points";

function toolFromPath(pathname: string): ToolId {
  return tools.find((tool) => tool.path === pathname)?.id ?? defaultToolId;
}

function pathForTool(toolId: ToolId): string {
  return tools.find((tool) => tool.id === toolId)?.path ?? "/graph";
}

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

  if (tool.id === "style") {
    return <StyleAnalysis />;
  }

  return <ToolPlaceholder title={tool.label} description={tool.note} />;
}

export function AppShell() {
  const [selectedTool, setSelectedTool] = useState<ToolId>(() => toolFromPath(window.location.pathname));

  useEffect(() => {
    const initialPath = pathForTool(toolFromPath(window.location.pathname));
    if (window.location.pathname !== initialPath) {
      window.history.replaceState({}, "", initialPath);
    }

    const handlePopState = () => {
      setSelectedTool(toolFromPath(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function handleToolChange(value: string) {
    const nextTool = value as ToolId;
    setSelectedTool(nextTool);

    const nextPath = pathForTool(nextTool);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
  }

  return (
    <Tabs.Root
      className="app-shell"
      value={selectedTool}
      onValueChange={handleToolChange}
    >
      <div className="app-layout">
        <nav className="tool-nav" aria-label="도구">
          <Tabs.List className="tool-tabs" aria-label="도구 선택">
            {tools.map((tool) => (
              <Tabs.Tab className="tool-tab" key={tool.id} value={tool.id}>
                {tool.label}
              </Tabs.Tab>
            ))}
            <Tabs.Indicator className="tool-tab-indicator" />
          </Tabs.List>
        </nav>

        <main className="workspace">
          {tools.map((tool) => (
            <Tabs.Panel className="tool-panel" key={tool.id} value={tool.id}>
              <Suspense fallback={<ToolPlaceholder title={tool.label} description="불러오는 중" />}>
                {selectedTool === tool.id ? renderTool(tool) : null}
              </Suspense>
            </Tabs.Panel>
          ))}
        </main>
      </div>
    </Tabs.Root>
  );
}
