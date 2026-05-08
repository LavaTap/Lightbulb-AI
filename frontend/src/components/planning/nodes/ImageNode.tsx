import { useState, useCallback, useRef, type MouseEvent } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export function ImageNode({ selected, data }: NodeProps) {
  const [size, setSize] = useState({ width: 240, height: 180 });
  const resizingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const handleResizeStart = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      resizingRef.current = true;
      startPosRef.current = {
        x: e.clientX,
        y: e.clientY,
        w: size.width,
        h: size.height,
      };

      const handleResizeMove = (ev: globalThis.MouseEvent) => {
        if (!resizingRef.current) return;
        const dx = ev.clientX - startPosRef.current.x;
        const newWidth = Math.max(100, startPosRef.current.w + dx);
        const newHeight = Math.max(60, (newWidth / startPosRef.current.w) * startPosRef.current.h);
        setSize({ width: newWidth, height: newHeight });
      };

      const handleResizeEnd = () => {
        resizingRef.current = false;
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };

      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
    },
    [size],
  );

  return (
    <div
      className={`group relative rounded-xl border shadow-sm backdrop-blur-sm overflow-hidden transition-shadow duration-200
        bg-white/90 dark:bg-gray-800/90
        border-gray-200 dark:border-gray-700
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

      <img
        src={data.imageSrc as string}
        alt={(data.alt as string) || 'Image'}
        className="w-full object-contain pointer-events-none"
        style={{ height: size.height }}
        draggable={false}
      />

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={handleResizeStart}
      >
        <svg
          className="w-4 h-4 text-gray-400 dark:text-gray-500"
          fill="none"
          viewBox="0 0 16 16"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M14 2L2 14M14 8L8 14M14 14L14 14" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
