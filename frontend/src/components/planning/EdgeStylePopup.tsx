import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowRight, Minus, Zap, Move, ArrowLeft, Trash2, GripVertical, ArrowLeftRight } from 'lucide-react';

interface EdgeStylePopupProps {
  edgeId: string;
  position: { x: number; y: number };
  currentType: 'planning-smoothstep' | 'planning-bezier' | 'planning-straight';
  currentShowArrow: boolean;
  currentArrowStart?: boolean;
  currentArrowEnd?: boolean;
  onUpdate: (edgeId: string, updates: { type?: string; showArrow?: boolean; arrowStart?: boolean; arrowEnd?: boolean }) => void;
  onDelete: (edgeId: string) => void;
  onClose: () => void;
}

export function EdgeStylePopup({
  edgeId,
  position,
  currentType,
  currentShowArrow: _currentShowArrow,
  currentArrowStart = false,
  currentArrowEnd = false,
  onUpdate,
  onDelete,
  onClose,
}: EdgeStylePopupProps) {
  const [arrowStart, setArrowStart] = useState(currentArrowStart);
  const [arrowEnd, setArrowEnd] = useState(currentArrowEnd);
  const [edgeType, setEdgeType] = useState(currentType);
  const [popupPosition, setPopupPosition] = useState(position);
  const [isDragging, setIsDragging] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const hasInitializedRef = useRef(false);

  // 重置关闭计时器
  const resetCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      onClose();
    }, 3000); // 3秒无操作自动关闭
  }, [onClose]);

  // 初始化计时器
  useEffect(() => {
    resetCloseTimer();
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, [resetCloseTimer]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleTypeChange = useCallback((type: 'planning-smoothstep' | 'planning-bezier' | 'planning-straight') => {
    setEdgeType(type);
    onUpdate(edgeId, { type });
    resetCloseTimer();
  }, [edgeId, onUpdate, resetCloseTimer]);





  const handleReverseArrows = useCallback(() => {
    const newArrowStart = arrowEnd;
    const newArrowEnd = arrowStart;
    setArrowStart(newArrowStart);
    setArrowEnd(newArrowEnd);
    onUpdate(edgeId, { arrowStart: newArrowStart, arrowEnd: newArrowEnd });
    resetCloseTimer();
  }, [edgeId, arrowStart, arrowEnd, onUpdate, resetCloseTimer]);

  const handleDelete = useCallback(() => {
    onDelete(edgeId);
    onClose();
  }, [edgeId, onDelete, onClose]);

  // 拖拽处理
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 只有左键可以拖拽
    if (e.button !== 0) return;
    
    setIsDragging(true);
    dragOffsetRef.current = {
      x: e.clientX - popupPosition.x,
      y: e.clientY - popupPosition.y,
    };
    e.preventDefault();
    e.stopPropagation();
  }, [popupPosition]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffsetRef.current.x;
    const newY = e.clientY - dragOffsetRef.current.y;
    
    setPopupPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 添加/移除全局鼠标事件监听
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 只在首次打开时设置位置，之后不再跟随外部 position 变化
  useEffect(() => {
    if (!hasInitializedRef.current) {
      setPopupPosition(position);
      hasInitializedRef.current = true;
    }
  }, [position]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'planning-smoothstep':
        return <Move className="w-4 h-4" />;
      case 'planning-bezier':
        return <Zap className="w-4 h-4" />;
      case 'planning-straight':
        return <Minus className="w-4 h-4" />;
      default:
        return <Move className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'planning-smoothstep':
        return '折线';
      case 'planning-bezier':
        return '曲线';
      case 'planning-straight':
        return '直线';
      default:
        return '折线';
    }
  };

  return (
    <div
      ref={popupRef}
      className="absolute z-50 rounded-lg shadow-xl border border-white/20 dark:border-black/30 p-3 min-w-[180px] backdrop-blur-lg bg-glass-light/90 dark:bg-glass-dark/90"
      style={{
        left: `${popupPosition.x}px`,
        top: `${popupPosition.y}px`,
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
      {/* 拖拽手柄 - 标题栏 */}
      <div
        className="flex items-center justify-between mb-3 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">连线样式</h3>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-xs p-1"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-3">
        {/* 线型选择 */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-2">线型</label>
          <div className="flex gap-1">
            {(['planning-smoothstep', 'planning-bezier', 'planning-straight'] as const).map((type) => (
              <button
                key={type}
                onClick={() => handleTypeChange(type)}
                className={`flex-1 flex flex-col items-center justify-center p-2 rounded-md transition-colors ${
                  edgeType === type
                    ? 'bg-primary-100/50 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 backdrop-blur-sm'
                    : 'bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 text-gray-700 dark:text-gray-300 backdrop-blur-sm'
                }`}
              >
                {getTypeIcon(type)}
                <span className="text-xs mt-1">{getTypeLabel(type)}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* 箭头方向 */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-2">箭头方向</label>
          <div className="flex gap-1">
            {/* 无箭头 */}
            <button
              onClick={() => {
                setArrowStart(false);
                setArrowEnd(false);
                onUpdate(edgeId, { arrowStart: false, arrowEnd: false });
                resetCloseTimer();
              }}
              className={`flex-1 flex flex-col items-center justify-center p-2 rounded-md transition-colors ${
                !arrowStart && !arrowEnd
                  ? 'bg-primary-100/50 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 backdrop-blur-sm'
                  : 'bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 text-gray-700 dark:text-gray-300 backdrop-blur-sm'
              }`}
            >
              <Minus className="w-4 h-4" />
              <span className="text-xs mt-1">无</span>
            </button>
            {/* 起始箭头 */}
            <button
              onClick={() => {
                const newStart = !arrowStart;
                setArrowStart(newStart);
                onUpdate(edgeId, { arrowStart: newStart });
                resetCloseTimer();
              }}
              className={`flex-1 flex flex-col items-center justify-center p-2 rounded-md transition-colors ${
                arrowStart
                  ? 'bg-primary-100/50 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 backdrop-blur-sm'
                  : 'bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 text-gray-700 dark:text-gray-300 backdrop-blur-sm'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs mt-1">起点</span>
            </button>
            {/* 结束箭头 */}
            <button
              onClick={() => {
                const newEnd = !arrowEnd;
                setArrowEnd(newEnd);
                onUpdate(edgeId, { arrowEnd: newEnd });
                resetCloseTimer();
              }}
              className={`flex-1 flex flex-col items-center justify-center p-2 rounded-md transition-colors ${
                arrowEnd
                  ? 'bg-primary-100/50 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 backdrop-blur-sm'
                  : 'bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 text-gray-700 dark:text-gray-300 backdrop-blur-sm'
              }`}
            >
              <ArrowRight className="w-4 h-4" />
              <span className="text-xs mt-1">终点</span>
            </button>
            {/* 双向箭头 */}
            <button
              onClick={() => {
                const willBeBidirectional = !(arrowStart && arrowEnd);
                setArrowStart(willBeBidirectional);
                setArrowEnd(willBeBidirectional);
                onUpdate(edgeId, { arrowStart: willBeBidirectional, arrowEnd: willBeBidirectional });
                resetCloseTimer();
              }}
              className={`flex-1 flex flex-col items-center justify-center p-2 rounded-md transition-colors ${
                arrowStart && arrowEnd
                  ? 'bg-primary-100/50 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 backdrop-blur-sm'
                  : 'bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 text-gray-700 dark:text-gray-300 backdrop-blur-sm'
              }`}
            >
              <div className="flex items-center">
                <ArrowLeft className="w-3 h-3" />
                <ArrowRight className="w-3 h-3" />
              </div>
              <span className="text-xs mt-1">双向</span>
            </button>
            {/* 反转箭头 */}
            <button
              onClick={handleReverseArrows}
              className={`flex-1 flex flex-col items-center justify-center p-2 rounded-md transition-colors ${
                arrowStart !== arrowEnd
                  ? 'bg-primary-100/50 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 backdrop-blur-sm'
                  : 'bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 text-gray-700 dark:text-gray-300 backdrop-blur-sm'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span className="text-xs mt-1">反转</span>
            </button>
          </div>
        </div>
        
        {/* 删除按钮 */}
        <div className="pt-3 border-t border-white/20 dark:border-black/30">
          <button
            onClick={handleDelete}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-red-500/10 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-500/20 dark:hover:bg-red-900/40 transition-colors backdrop-blur-sm"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm font-medium">删除连线</span>
          </button>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-white/20 dark:border-black/30">
        <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
          点击外部或3秒后自动关闭
        </p>
      </div>
    </div>
  );
}