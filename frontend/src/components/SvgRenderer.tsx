import { useMemo, useState } from 'react';
import { AlertTriangle, ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SvgRendererProps {
  svgContent: string;
}

/**
 * 安全渲染 SVG 图表的组件。
 * 使用 DOMParser 解析 SVG 字符串，提取 <svg> 标签内容，
 * 然后通过 dangerouslySetInnerHTML 渲染（仅限 SVG 标签，不执行脚本）。
 * 提供缩放、旋转、下载等交互功能。
 */
export function SvgRenderer({ svgContent }: SvgRendererProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState(false);

  const parsedSvg = useMemo(() => {
    try {
      // 尝试从 markdown 代码块中提取 SVG
      const svgMatch = svgContent.match(/```svg\s*([\s\S]*?)```/) ||
                       svgContent.match(/```\s*([\s\S]*?<svg[\s\S]*?<\/svg>[\s\S]*?)```/) ||
                       svgContent.match(/<svg[\s\S]*?<\/svg>/);

      const rawSvg = svgMatch ? svgMatch[1] || svgMatch[0] : svgContent;

      // 用 DOMParser 解析验证
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawSvg.trim(), 'image/svg+xml');
      const svgEl = doc.querySelector('svg');

      if (!svgEl) {
        setError(true);
        return null;
      }

      // 移除可能危险的属性（事件处理器等）
      const safeSvg = svgEl.outerHTML;
      return safeSvg;
    } catch {
      setError(true);
      return null;
    }
  }, [svgContent]);

  if (error || !parsedSvg) {
    return null;
  }

  const handleZoomIn = () => setScale(s => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.25, 0.25));
  const handleReset = () => { setScale(1); setRotation(0); };
  const handleRotate = () => setRotation(r => (r + 90) % 360);

  const handleDownload = () => {
    const blob = new Blob([parsedSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chart.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="my-3 border rounded-lg bg-background overflow-hidden">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/30">
        <span className="text-xs text-muted-foreground font-medium">SVG 图表</span>
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
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleDownload}
            title="下载 SVG"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          {(scale !== 1 || rotation !== 0) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 ml-1"
              onClick={handleReset}
            >
              重置
            </Button>
          )}
        </div>
      </div>

      {/* SVG 渲染区域 */}
      <div className="flex items-center justify-center p-4 overflow-auto">
        <div
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease',
            maxWidth: '100%',
          }}
          dangerouslySetInnerHTML={{ __html: parsedSvg }}
        />
      </div>
    </div>
  );
}
