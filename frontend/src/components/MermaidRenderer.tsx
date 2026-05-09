import { useRef, useEffect, useState } from "react";
import {
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import mermaid from "mermaid";

interface MermaidRendererProps {
  code: string;
}

/**
 * 渲染 Mermaid 图表组件。
 * 支持流程图、时序图、饼图、甘特图、类图等多种图表类型。
 * 提供缩放、旋转、下载等交互功能。
 */
export function MermaidRenderer({ code }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);
  const [svgContent, setSvgContent] = useState<string>("");

  // 初始化 mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "strict",
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
      },
      pie: {
        useMaxWidth: true,
      },
    });
  }, []);

  // 渲染图表
  useEffect(() => {
    if (!containerRef.current) return;

    const renderDiagram = async () => {
      try {
        setError(null);
        // 生成唯一 ID
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, code.trim());
        setSvgContent(svg);
        setRendered(true);
      } catch (err) {
        console.error("Mermaid render error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to render diagram",
        );
        setRendered(false);
      }
    };

    renderDiagram();
  }, [code]);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.25));
  const handleReset = () => {
    setScale(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handleDownload = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPng = () => {
    if (!svgContent) return;

    const img = new Image();
    const svgBlob = new Blob([svgContent], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = 2; // 2x 缩放提高清晰度
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = "diagram.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(pngUrl);
        URL.revokeObjectURL(url);
      }, "image/png");
    };

    img.src = url;
  };

  if (error) {
    return (
      <div className="my-3 border rounded-lg bg-destructive/5 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-destructive/10">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium">图表渲染失败</span>
          </div>
        </div>
        <div className="p-3 overflow-auto">
          <pre className="text-xs bg-background p-2 rounded">{error}</pre>
          <details className="mt-2">
            <summary className="text-xs text-muted-foreground cursor-pointer">
              查看原始代码
            </summary>
            <pre className="text-xs bg-background p-2 rounded mt-2 overflow-auto">
              {code}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div className="my-3 border rounded-lg bg-background overflow-hidden">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/30">
        <span className="text-xs text-muted-foreground font-medium">
          Mermaid 图表
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleZoomOut}
            title="缩小"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[3ch] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleZoomIn}
            title="放大"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleRotate}
            title="旋转"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 p-0 px-2 text-xs"
            onClick={handleDownload}
            title="下载 SVG"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            SVG
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 p-0 px-2 text-xs"
            onClick={handleDownloadPng}
            title="下载 PNG"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            PNG
          </Button>
          {(scale !== 1 || rotation !== 0) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 ml-1"
              onClick={handleReset}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              重置
            </Button>
          )}
        </div>
      </div>

      {/* SVG 渲染区域 */}
      <div className="p-4 overflow-auto">
        <div
          className="flex items-center justify-center"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transformOrigin: "center center",
            transition: "transform 0.2s ease",
          }}
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
        {!rendered && !error && (
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
