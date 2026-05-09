import { useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import { ZoomIn, ZoomOut, Maximize2, ChevronDown, ChevronUp, X, GripVertical, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown } from 'lucide-react';

interface ImageNodeData {
  imageSrc?: string;
  alt?: string;
  zoomLevel?: number;
  [key: string]: unknown;
}

export function ImageNode({ id, selected, data }: NodeProps) {
  const [size, setSize] = useState({ width: 240, height: 180 });
  const [showPanel, setShowPanel] = useState(false);
  const [zoomLevel, setZoomLevel] = useState((data as ImageNodeData).zoomLevel || 100);
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(true);
  const [panelPosition, setPanelPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const initializedRef = useRef(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const naturalSizeRef = useRef({ width: 0, height: 0 });
  const nodeRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 监听外部 zoomLevel 变化
  useEffect(() => {
    const externalZoom = (data as ImageNodeData).zoomLevel;
    if (externalZoom !== undefined && externalZoom !== zoomLevel) {
      handleZoom(externalZoom);
    }
  }, [data]);

  const { getNodes, setNodes, getNode } = useReactFlow();

  // 重置关闭计时器
  const resetCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setShowPanel(false);
    }, 3000);
  }, []);

  // 初始化计时器
  useEffect(() => {
    if (showPanel) {
      resetCloseTimer();
    }
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, [showPanel, resetCloseTimer]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleImageLoad = useCallback(() => {
    if (initializedRef.current || !imgRef.current) return;

    const img = imgRef.current;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    naturalSizeRef.current = { width: naturalWidth, height: naturalHeight };

    let width = naturalWidth;
    let height = naturalHeight;

    if (width > 600) {
      const scale = 600 / width;
      width = 600;
      height = naturalHeight * scale;
    } else if (width < 100) {
      const scale = 100 / width;
      width = 100;
      height = naturalHeight * scale;
    }

    height = Math.max(60, height);

    setSize({ width, height });
    initializedRef.current = true;

    const currentZoom = Math.round((width / naturalWidth) * 100);
    setZoomLevel(currentZoom);
  }, []);

  const handleZoom = useCallback((newZoom: number) => {
    if (naturalSizeRef.current.width === 0) return;

    const clampedZoom = Math.max(10, Math.min(500, newZoom));
    const newWidth = (naturalSizeRef.current.width * clampedZoom) / 100;
    const newHeight = (naturalSizeRef.current.height * clampedZoom) / 100;

    setSize({ width: newWidth, height: newHeight });
    setZoomLevel(clampedZoom);
    resetCloseTimer();
  }, [resetCloseTimer]);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseInt(e.target.value);
    requestAnimationFrame(() => {
      handleZoom(newZoom);
    });
  }, [handleZoom]);

  const handleZoomIn = useCallback(() => {
    handleZoom(zoomLevel + 25);
  }, [zoomLevel, handleZoom]);

  const handleZoomOut = useCallback(() => {
    handleZoom(zoomLevel - 25);
  }, [zoomLevel, handleZoom]);

  const handleResetZoom = useCallback(() => {
    handleZoom(100);
  }, [handleZoom]);

  const handleFitToScreen = useCallback(() => {
    const naturalWidth = naturalSizeRef.current.width;
    if (naturalWidth > 800) {
      const zoom = Math.round((800 / naturalWidth) * 100);
      handleZoom(zoom);
    } else if (naturalWidth < 400) {
      const zoom = Math.round((400 / naturalWidth) * 100);
      handleZoom(Math.min(zoom, 200));
    } else {
      handleZoom(100);
    }
  }, [handleZoom]);

  // 图层调整功能
  const bringToFront = useCallback(() => {
    const nodes = getNodes();
    const maxZIndex = Math.max(...nodes.map(n => n.computed?.zIndex || 0), 0);
    setNodes(nodes.map(n => {
      if (n.id === id) {
        return { ...n, computed: { ...n.computed, zIndex: maxZIndex + 1 } };
      }
      return n;
    }));
    resetCloseTimer();
  }, [getNodes, setNodes, id, resetCloseTimer]);

  const sendToBack = useCallback(() => {
    const nodes = getNodes();
    const minZIndex = Math.min(...nodes.map(n => n.computed?.zIndex || 0), 0);
    setNodes(nodes.map(n => {
      if (n.id === id) {
        return { ...n, computed: { ...n.computed, zIndex: minZIndex - 1 } };
      }
      return n;
    }));
    resetCloseTimer();
  }, [getNodes, setNodes, id, resetCloseTimer]);

  const bringForward = useCallback(() => {
    const nodes = getNodes();
    const currentNode = getNode(id);
    if (!currentNode) return;

    const currentZIndex = currentNode.computed?.zIndex || 0;
    const aboveNodes = nodes
      .filter(n => (n.computed?.zIndex || 0) > currentZIndex)
      .sort((a, b) => (a.computed?.zIndex || 0) - (b.computed?.zIndex || 0));

    if (aboveNodes.length > 0) {
      const targetZIndex = aboveNodes[0].computed?.zIndex || 0;
      setNodes(nodes.map(n => {
        if (n.id === id) {
          return { ...n, computed: { ...n.computed, zIndex: targetZIndex } };
        }
        if (n.id === aboveNodes[0].id) {
          return { ...n, computed: { ...n.computed, zIndex: currentZIndex } };
        }
        return n;
      }));
    } else {
      bringToFront();
    }
    resetCloseTimer();
  }, [getNodes, setNodes, getNode, id, bringToFront, resetCloseTimer]);

  const sendBackward = useCallback(() => {
    const nodes = getNodes();
    const currentNode = getNode(id);
    if (!currentNode) return;

    const currentZIndex = currentNode.computed?.zIndex || 0;
    const belowNodes = nodes
      .filter(n => (n.computed?.zIndex || 0) < currentZIndex)
      .sort((a, b) => (b.computed?.zIndex || 0) - (a.computed?.zIndex || 0));

    if (belowNodes.length > 0) {
      const targetZIndex = belowNodes[0].computed?.zIndex || 0;
      setNodes(nodes.map(n => {
        if (n.id === id) {
          return { ...n, computed: { ...n.computed, zIndex: targetZIndex } };
        }
        if (n.id === belowNodes[0].id) {
          return { ...n, computed: { ...n.computed, zIndex: currentZIndex } };
        }
        return n;
      }));
    } else {
      sendToBack();
    }
    resetCloseTimer();
  }, [getNodes, setNodes, getNode, id, sendToBack, resetCloseTimer]);

  // 面板拖拽处理
  const handlePanelMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;

    setIsDragging(true);
    dragOffsetRef.current = {
      x: e.clientX - panelPosition.x,
      y: e.clientY - panelPosition.y,
    };
    e.preventDefault();
    e.stopPropagation();
  }, [panelPosition]);

  const handlePanelMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragOffsetRef.current.x;
    const newY = e.clientY - dragOffsetRef.current.y;

    setPanelPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handlePanelMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handlePanelMouseMove);
      document.addEventListener('mouseup', handlePanelMouseUp);
    } else {
      document.removeEventListener('mousemove', handlePanelMouseMove);
      document.removeEventListener('mouseup', handlePanelMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handlePanelMouseMove);
      document.removeEventListener('mouseup', handlePanelMouseUp);
    };
  }, [isDragging, handlePanelMouseMove, handlePanelMouseUp]);

  // 当图片 URL 变化时重置初始化状态
  useEffect(() => {
    if (data.imageSrc) {
      initializedRef.current = false;
      if (imgRef.current && imgRef.current.complete) {
        handleImageLoad();
      }
    }
  }, [data.imageSrc, handleImageLoad]);

  // 每次打开面板时都重新计算位置（定位到图片右侧）
  useEffect(() => {
    if (showPanel && nodeRef.current) {
      const nodeRect = nodeRef.current.getBoundingClientRect();
      setPanelPosition({
        x: nodeRect.right + 10,
        y: nodeRect.top + 50,
      });
    }
  }, [showPanel]);

  return (
    <div 
      ref={nodeRef} 
      className="relative flex items-start gap-2"
    >
      {/* 图片主体 */}
      <div
        className={`group relative rounded-xl border shadow-sm backdrop-blur-sm transition-shadow duration-200
          bg-glass-light/90 dark:bg-glass-dark/90
          border-white/20 dark:border-black/30
          ${selected ? 'ring-2 ring-primary-400 dark:ring-primary-500 shadow-lg shadow-primary-500/10' : ''}`}
        style={{ width: size.width }}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-primary-500 !border-2 !border-white dark:!border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-primary-500 !border-2 !border-white dark:!border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-primary-500 !border-2 !border-white dark:!border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-primary-500 !border-2 !border-white dark:!border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
        />

        {/* 可收缩的顶部工具栏 */}
        {isToolbarExpanded ? (
          <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            {/* 工具栏头部 - 点击可收缩 */}
            <div
              className="flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-white/20 dark:hover:bg-black/20 transition-colors"
              onClick={() => setIsToolbarExpanded(false)}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">图片</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600 dark:text-gray-400">{zoomLevel}%</span>
                <ChevronUp className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
              </div>
            </div>

            {/* 展开的工具栏内容 */}
            <div className="flex items-center gap-1 px-2 py-1.5 border-t border-white/20 dark:border-black/30">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleZoomOut();
                }}
                className="p-1.5 rounded hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
                title="缩小"
              >
                <ZoomOut className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleResetZoom();
                }}
                className="px-2 py-1 rounded hover:bg-white/20 dark:hover:bg-white/10 transition-colors text-xs font-medium text-gray-700 dark:text-gray-300"
                title="原始大小"
              >
                100%
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleZoomIn();
                }}
                className="p-1.5 rounded hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
                title="放大"
              >
                <ZoomIn className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
              </button>
              <div className="w-px h-4 bg-gray-400 dark:bg-gray-500 mx-1" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleFitToScreen();
                }}
                className="p-1.5 rounded hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
                title="适配屏幕"
              >
                <Maximize2 className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPanel(!showPanel);
                }}
                className={`p-1.5 rounded transition-colors ${showPanel ? 'bg-primary-100/50 dark:bg-primary-900/50' : 'hover:bg-white/20 dark:hover:bg-white/10'}`}
                title="图片设置"
              >
                <span className={`text-xs font-medium ${showPanel ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}>设置</span>
              </button>
            </div>
          </div>
        ) : (
          /* 收缩状态 - 只显示展开按钮 */
          <div
            className="bg-white/10 dark:bg-black/10 border-b border-white/20 dark:border-black/30 px-3 py-1 cursor-pointer hover:bg-white/20 dark:hover:bg-black/20 transition-colors flex items-center justify-center"
            onClick={() => setIsToolbarExpanded(true)}
            title="展开工具栏"
          >
            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </div>
        )}

        <img
          ref={imgRef}
          src={(data as ImageNodeData).imageSrc as string}
          alt={((data as ImageNodeData).alt as string) || 'Image'}
          className="w-full object-contain pointer-events-none"
          style={{ height: size.height }}
          draggable={false}
          onLoad={handleImageLoad}
        />
      </div>

      {/* 独立弹窗 - 完全不跟随图片，套用 EdgeStylePopup 设计 */}
      {showPanel && (
        <div
          ref={panelRef}
          className="absolute z-50 rounded-lg shadow-xl border border-white/20 dark:border-black/30 p-3 min-w-[180px] backdrop-blur-lg bg-glass-light/90 dark:bg-glass-dark/90"
          style={{
            left: `${panelPosition.x}px`,
            top: `${panelPosition.y}px`,
            transform: 'translate(-50%, -100%)',
            cursor: isDragging ? 'grabbing' : 'default',
          }}
          onMouseEnter={() => {
            if (closeTimerRef.current) {
              clearTimeout(closeTimerRef.current);
            }
          }}
          onMouseLeave={resetCloseTimer}
        >
          {/* 拖拽手柄 */}
          <div
            className="flex items-center justify-between mb-3 cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handlePanelMouseDown}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">图片设置</h3>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPanel(false);
              }}
              className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-xs p-1"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            {/* 图层调整 */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">图层</label>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={bringToFront}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 transition-colors"
                  title="置顶"
                >
                  <ChevronsUp className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">置顶</span>
                </button>
                <button
                  onClick={bringForward}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 transition-colors"
                  title="上移一层"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">上移</span>
                </button>
                <button
                  onClick={sendBackward}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 transition-colors"
                  title="下移一层"
                >
                  <ArrowDown className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">下移</span>
                </button>
                <button
                  onClick={sendToBack}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 transition-colors"
                  title="置底"
                >
                  <ChevronsDown className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">置底</span>
                </button>
              </div>
            </div>
          </div>

          <p className="mt-3 pt-3 border-t border-white/20 dark:border-black/30 text-xs text-gray-600 dark:text-gray-400 text-center">
            点击外部或3秒后自动关闭
          </p>
        </div>
      )}
    </div>
  );
}
