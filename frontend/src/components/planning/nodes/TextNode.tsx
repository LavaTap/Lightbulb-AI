import { useState, useCallback, type KeyboardEvent, useRef, type MouseEvent, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Palette, Type as TypeIcon, Bold, Italic, Underline, X, GripVertical } from 'lucide-react';

export function TextNode({ id, data, selected }: NodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(data.text as string || '双击编辑');
  const [showStylePopup, setShowStylePopup] = useState(false);
  const [size, setSize] = useState({ width: 200, height: 80 });
  const [fontStyle, setFontStyle] = useState({
    color: data.color as string || '#000000',
    backgroundColor: data.backgroundColor as string || 'transparent',
    fontSize: data.fontSize as number || 14,
    fontWeight: data.fontWeight as string || 'normal',
    fontStyle: data.fontStyle as string || 'normal',
    textDecoration: data.textDecoration as string || 'none',
    showBackground: data.showBackground as boolean || false
  });
  
  const resizingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const resizeCornerRef = useRef<string>('');
  const popupRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditText(data.text as string || '双击编辑');
  }, [data.text]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    const onChange = data.onChange as ((id: string, text: string) => void) | undefined;
    if (onChange && (data.text as string) !== editText) {
      onChange(id, editText);
    }
  }, [data, id, editText]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleBlur();
      }
      if (e.key === 'Escape') {
        setEditText(data.text as string || '双击编辑');
        setIsEditing(false);
      }
    },
    [handleBlur, data.text],
  );

  const handleResizeStart = useCallback(
    (e: MouseEvent, corner: string) => {
      e.stopPropagation();
      e.preventDefault();
      resizingRef.current = true;
      resizeCornerRef.current = corner;
      startPosRef.current = {
        x: e.clientX,
        y: e.clientY,
        w: size.width,
        h: size.height,
      };

      const handleResizeMove = (ev: globalThis.MouseEvent) => {
        if (!resizingRef.current) return;
        
        const dx = ev.clientX - startPosRef.current.x;
        const dy = ev.clientY - startPosRef.current.y;
        
        let newWidth = size.width;
        let newHeight = size.height;
        
        switch (resizeCornerRef.current) {
          case 'top-left':
            newWidth = Math.max(80, startPosRef.current.w - dx);
            newHeight = Math.max(40, startPosRef.current.h - dy);
            break;
          case 'top-right':
            newWidth = Math.max(80, startPosRef.current.w + dx);
            newHeight = Math.max(40, startPosRef.current.h - dy);
            break;
          case 'bottom-left':
            newWidth = Math.max(80, startPosRef.current.w - dx);
            newHeight = Math.max(40, startPosRef.current.h + dy);
            break;
          case 'bottom-right':
            newWidth = Math.max(80, startPosRef.current.w + dx);
            newHeight = Math.max(40, startPosRef.current.h + dy);
            break;
        }
        
        setSize({ width: newWidth, height: newHeight });
      };

      const handleResizeEnd = () => {
        resizingRef.current = false;
        resizeCornerRef.current = '';
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };

      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
    },
    [size],
  );

  const handleStyleChange = useCallback((key: string, value: any) => {
    setFontStyle(prev => ({ ...prev, [key]: value }));
    const onStyleChange = data.onStyleChange as ((id: string, styles: any) => void) | undefined;
    if (onStyleChange) {
      onStyleChange(id, { ...fontStyle, [key]: value });
    }
  }, [data, id, fontStyle]);

  const toggleBackground = useCallback(() => {
    const newShowBackground = !fontStyle.showBackground;
    handleStyleChange('showBackground', newShowBackground);
  }, [fontStyle.showBackground, handleStyleChange]);

  // 点击外部关闭样式弹窗
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowStylePopup(false);
      }
    };
    
    if (showStylePopup) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showStylePopup]);

  // 编辑时自动聚焦并选中文本
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const textStyle = {
    color: fontStyle.color,
    fontSize: `${fontStyle.fontSize}px`,
    fontWeight: fontStyle.fontWeight,
    fontStyle: fontStyle.fontStyle,
    textDecoration: fontStyle.textDecoration,
    backgroundColor: fontStyle.showBackground ? fontStyle.backgroundColor : 'transparent',
  };

  return (
    <div
      className={`group relative rounded-xl border shadow-sm backdrop-blur-sm transition-all duration-200 overflow-hidden
        ${fontStyle.showBackground ? '' : 'bg-transparent'}
        border-gray-200 dark:border-gray-700
        ${selected ? 'ring-2 ring-primary-400 dark:ring-primary-500 shadow-lg shadow-primary-500/10' : ''}`}
      style={{ 
        width: size.width, 
        height: size.height,
        backgroundColor: fontStyle.showBackground ? fontStyle.backgroundColor : 'transparent'
      }}
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

      {/* 标题栏 - 可拖拽区域 */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">文本</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowStylePopup(!showStylePopup)}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="字体样式"
          >
            <TypeIcon className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={toggleBackground}
            className={`p-1 rounded transition-colors ${fontStyle.showBackground ? 'bg-primary-100 dark:bg-primary-900/30' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            title={fontStyle.showBackground ? "隐藏背景" : "显示背景"}
          >
            <Palette className={`w-3.5 h-3.5 ${fontStyle.showBackground ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400'}`} />
          </button>
        </div>
      </div>

      {/* 字体样式弹窗 */}
      {showStylePopup && (
        <div
          ref={popupRef}
          className="absolute top-8 right-0 z-20 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 min-w-[200px]"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">字体样式</h3>
            <button
              onClick={() => setShowStylePopup(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="space-y-3">
            {/* 颜色选择 */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">文字颜色</label>
              <input
                type="color"
                value={fontStyle.color}
                onChange={(e) => handleStyleChange('color', e.target.value)}
                className="w-full h-8 rounded border border-gray-300 dark:border-gray-600"
              />
            </div>
            
            {/* 背景颜色 */}
            {fontStyle.showBackground && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">背景颜色</label>
                <input
                  type="color"
                  value={fontStyle.backgroundColor}
                  onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                  className="w-full h-8 rounded border border-gray-300 dark:border-gray-600"
                />
              </div>
            )}
            
            {/* 字体大小 */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">字体大小</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="8"
                  max="72"
                  value={fontStyle.fontSize}
                  onChange={(e) => handleStyleChange('fontSize', parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 w-10 text-right">{fontStyle.fontSize}px</span>
              </div>
            </div>
            
            {/* 字体样式按钮 */}
            <div className="flex gap-1">
              <button
                onClick={() => handleStyleChange('fontWeight', fontStyle.fontWeight === 'bold' ? 'normal' : 'bold')}
                className={`flex-1 p-2 rounded-md ${fontStyle.fontWeight === 'bold' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'bg-gray-100 dark:bg-gray-700'}`}
                title="加粗"
              >
                <Bold className="w-4 h-4 mx-auto" />
              </button>
              <button
                onClick={() => handleStyleChange('fontStyle', fontStyle.fontStyle === 'italic' ? 'normal' : 'italic')}
                className={`flex-1 p-2 rounded-md ${fontStyle.fontStyle === 'italic' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'bg-gray-100 dark:bg-gray-700'}`}
                title="斜体"
              >
                <Italic className="w-4 h-4 mx-auto" />
              </button>
              <button
                onClick={() => handleStyleChange('textDecoration', fontStyle.textDecoration === 'underline' ? 'none' : 'underline')}
                className={`flex-1 p-2 rounded-md ${fontStyle.textDecoration === 'underline' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'bg-gray-100 dark:bg-gray-700'}`}
                title="下划线"
              >
                <Underline className="w-4 h-4 mx-auto" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 文本内容区域 */}
      <div 
        className="p-3 h-[calc(100%-40px)] overflow-auto"
        onDoubleClick={handleDoubleClick}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            className="nodrag nowheel w-full h-full bg-transparent resize-none outline-none"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onMouseDown={(e) => e.stopPropagation()}
            style={textStyle}
          />
        ) : (
          <div 
            className="whitespace-pre-wrap break-words select-none w-full h-full overflow-auto"
            style={textStyle}
          >
            {(data.text as string) || '双击编辑'}
          </div>
        )}
      </div>

      {/* 四角缩放手柄 - 阻止事件冒泡防止触发移动 */}
      <div
        className="absolute top-8 left-0 w-4 h-4 cursor-nw-resize opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onMouseDown={(e) => {
          e.stopPropagation();
          handleResizeStart(e, 'top-left');
        }}
      >
        <div className="w-2 h-2 border-2 border-gray-400 dark:border-gray-500 rounded-full" />
      </div>
      <div
        className="absolute top-8 right-0 w-4 h-4 cursor-ne-resize opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onMouseDown={(e) => {
          e.stopPropagation();
          handleResizeStart(e, 'top-right');
        }}
      >
        <div className="w-2 h-2 border-2 border-gray-400 dark:border-gray-500 rounded-full" />
      </div>
      <div
        className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onMouseDown={(e) => {
          e.stopPropagation();
          handleResizeStart(e, 'bottom-left');
        }}
      >
        <div className="w-2 h-2 border-2 border-gray-400 dark:border-gray-500 rounded-full" />
      </div>
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onMouseDown={(e) => {
          e.stopPropagation();
          handleResizeStart(e, 'bottom-right');
        }}
      >
        <div className="w-2 h-2 border-2 border-gray-400 dark:border-gray-500 rounded-full" />
      </div>
    </div>
  );
}
