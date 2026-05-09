import { useRef, useState, useCallback, useEffect } from 'react';

interface Point {
  x: number;
  y: number;
}

interface DrawPath {
  points: Point[];
  color: string;
  width: number;
}

interface DrawingCanvasProps {
  width: number;
  height: number;
  isDrawingMode: boolean;
  initialPaths?: DrawPath[];
  onDrawingChange?: (paths: DrawPath[]) => void;
  onSave?: (base64: string) => void;
}

const COLORS = [
  '#ef4444', // 红色
  '#f97316', // 橙色
  '#eab308', // 黄色
  '#22c55e', // 绿色
  '#3b82f6', // 蓝色
  '#8b5cf6', // 紫色
  '#ec4899', // 粉色
  '#000000', // 黑色
];

const BRUSH_SIZES = [2, 4, 8, 12];

export function DrawingCanvas({ width, height, isDrawingMode, initialPaths, onDrawingChange, onSave }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<DrawPath[]>(initialPaths || []);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1]);
  const [showToolbar, setShowToolbar] = useState(false);

  // 绘制所有路径
  const redrawCanvas = useCallback((ctx: CanvasRenderingContext2D, currentPaths: DrawPath[]) => {
    ctx.clearRect(0, 0, width, height);
    
    currentPaths.forEach((path) => {
      if (path.points.length < 2) return;
      
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.moveTo(path.points[0].x, path.points[0].y);
      
      for (let i = 1; i < path.points.length - 1; i++) {
        const xc = (path.points[i].x + path.points[i + 1].x) / 2;
        const yc = (path.points[i].y + path.points[i + 1].y) / 2;
        ctx.quadraticCurveTo(path.points[i].x, path.points[i].y, xc, yc);
      }
      
      if (path.points.length > 1) {
        const lastPoint = path.points[path.points.length - 1];
        ctx.lineTo(lastPoint.x, lastPoint.y);
      }
      
      ctx.stroke();
    });
  }, [width, height]);

  // 初始路径加载后渲染到 canvas
  useEffect(() => {
    if (initialPaths && initialPaths.length > 0) {
      setPaths(initialPaths);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        redrawCanvas(ctx, initialPaths);
      }
    }
  }, [initialPaths, redrawCanvas]);

  // 获取画布坐标
  const getCanvasPoint = useCallback((e: React.MouseEvent<HTMLCanvasElement> | MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // 开始绘制
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    
    setIsDrawing(true);
    const point = getCanvasPoint(e);
    setCurrentPath([point]);
  }, [isDrawingMode, getCanvasPoint]);

  // 绘制中
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDrawing || !isDrawingMode) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    
    const point = getCanvasPoint(e);
    setCurrentPath((prev) => {
      const newPath = [...prev, point];
      
      // 实时绘制
      if (newPath.length >= 2) {
        ctx.clearRect(0, 0, width, height);
        redrawCanvas(ctx, [...paths, { points: newPath, color: selectedColor, width: brushSize }]);
      }
      
      return newPath;
    });
  }, [isDrawing, isDrawingMode, getCanvasPoint, paths, selectedColor, brushSize, width, height, redrawCanvas]);

  // 结束绘制
  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    
    if (currentPath.length > 1) {
      const newPath: DrawPath = {
        points: currentPath,
        color: selectedColor,
        width: brushSize,
      };
      const newPaths = [...paths, newPath];
      setPaths(newPaths);
      onDrawingChange?.(newPaths);
    }
    
    setCurrentPath([]);
    
    // 重绘所有路径
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      redrawCanvas(ctx, paths.length > 0 ? [...paths] : []);
    }
  }, [isDrawing, currentPath, selectedColor, brushSize, paths, onDrawingChange, redrawCanvas]);

  // 添加全局鼠标事件监听
  useEffect(() => {
    if (isDrawing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDrawing, handleMouseMove, handleMouseUp]);

  // 撤销
  const handleUndo = useCallback(() => {
    if (paths.length === 0) return;
    
    const newPaths = paths.slice(0, -1);
    setPaths(newPaths);
    onDrawingChange?.(newPaths);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      redrawCanvas(ctx, newPaths);
    }
  }, [paths, onDrawingChange, redrawCanvas]);

  // 清除
  const handleClear = useCallback(() => {
    setPaths([]);
    onDrawingChange?.([]);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, width, height);
    }
  }, [width, height, onDrawingChange]);

  // 导出为 base64
  const exportAsBase64 = useCallback((): string | null => {
    return canvasRef.current?.toDataURL('image/png') || null;
  }, []);

  if (!isDrawingMode && paths.length === 0) {
    return null;
  }

  return (
    <div 
      className="absolute inset-0 pointer-events-none z-50" 
      style={{ width, height }}
    >
      {/* 绘图画布 */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={`absolute inset-0 ${isDrawingMode ? 'pointer-events-auto cursor-crosshair' : ''}`}
        onMouseDown={handleMouseDown}
        style={{ background: 'transparent' }}
      />
      
      {/* 绘图工具栏 - 只在有绘制内容或绘图模式时显示 */}
      {(isDrawingMode || paths.length > 0) && (
        <div 
          className="absolute top-2 right-2 flex items-center gap-1 bg-white/95 dark:bg-gray-800/95 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1.5 pointer-events-auto"
          style={{ zIndex: 10001 }}
        >
          {/* 颜色选择 */}
          <div className="flex items-center gap-0.5 px-1">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-4 h-4 rounded-full border-2 transition-transform ${
                  selectedColor === color 
                    ? 'border-gray-800 dark:border-white scale-110' 
                    : 'border-transparent hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-0.5" />
          
          {/* 画笔大小 */}
          <div className="flex items-center gap-0.5 px-1">
            {BRUSH_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => setBrushSize(size)}
                className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                  brushSize === size 
                    ? 'bg-primary-100 dark:bg-primary-900/30' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={`${size}px`}
              >
                <div 
                  className="rounded-full bg-gray-600 dark:bg-gray-400"
                  style={{ width: size, height: size }}
                />
              </button>
            ))}
          </div>
          
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-0.5" />
          
          {/* 撤销 */}
          <button
            onClick={handleUndo}
            disabled={paths.length === 0}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="撤销"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-400">
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
          </button>
          
          {/* 清除 */}
          <button
            onClick={handleClear}
            disabled={paths.length === 0}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="清除全部"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-400">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-0.5" />

          {/* 保存 */}
          <button
            onClick={() => {
              const dataUrl = exportAsBase64();
              if (dataUrl && onSave) {
                onSave(dataUrl);
              }
            }}
            disabled={paths.length === 0}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="保存为图片"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-400">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export type { DrawPath, Point };
