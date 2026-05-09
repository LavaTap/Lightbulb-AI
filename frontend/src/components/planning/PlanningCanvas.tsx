import { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Viewport,
  type OnMoveEnd,
  type NodeTypes,
  type EdgeTypes,
  useReactFlow,
} from '@xyflow/react';
import { TextNode } from './nodes/TextNode';
import { ImageNode } from './nodes/ImageNode';
import {
  PlanningSmoothstepEdge,
  PlanningBezierEdge,
  PlanningStraightEdge,
} from './edges/PlanningEdge';

const nodeTypes: NodeTypes = {
  planningText: TextNode,
  planningImage: ImageNode,
};

const edgeTypes: EdgeTypes = {
  'planning-smoothstep': PlanningSmoothstepEdge,
  'planning-bezier': PlanningBezierEdge,
  'planning-straight': PlanningStraightEdge,
};

interface PlanningCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onMoveEnd: OnMoveEnd;
  initialViewport?: Viewport;
  scrollToPan?: boolean;
  onEdgeClick?: (event: React.MouseEvent, edge: Edge) => void;
  onAddImageNode: (imageSrc: string, position: { x: number; y: number }) => void;
}

export function PlanningCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onMoveEnd,
  initialViewport,
  scrollToPan = false,
  onEdgeClick,
  onAddImageNode,
}: PlanningCanvasProps) {
  const reactFlowWrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [isDragOver, setIsDragOver] = useState(false);

  const defaultEdgeOptions = {
    type: 'planning-smoothstep' as const,
    style: { stroke: '#8b5cf6', strokeWidth: 2 },
    animated: false,
  };

  const connectionLineStyle = { stroke: '#8b5cf6', strokeWidth: 2 };

  const handleInit = useCallback(
    (instance: { fitView: () => void; setViewport: (vp: Viewport) => void }) => {
      if (initialViewport) {
        instance.setViewport(initialViewport);
      }
    },
    [initialViewport],
  );

  // 检查文件是否为图片格式
  const isImageFile = (file: File): boolean => {
    const imageTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/x-icon',
      'image/svg+xml',
    ];
    // 检查 MIME 类型
    if (imageTypes.includes(file.type)) {
      return true;
    }
    // 通过扩展名二次检查（某些情况下 MIME 类型可能不正确）
    const ext = file.name.split('.').pop()?.toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico', 'svg'];
    return imageExts.includes(ext || '');
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 检查是否有文件正在拖拽
    if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 只有当离开真正的容器时才隐藏覆盖层
    if (e.currentTarget === e.target) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!e.dataTransfer || !reactFlowWrapperRef.current) {
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) {
      return;
    }

    // 获取鼠标位置并转换为画布坐标
    const position = screenToFlowPosition({
      x: e.clientX,
      y: e.clientY,
    });

    // 处理每个图片文件
    let currentX = position.x;
    let currentY = position.y;
    const offsetStep = 40; // 多个图片错开摆放

    files.forEach((file, index) => {
      if (!isImageFile(file)) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          // 如果拖入多个图片，错开位置摆放
          const finalPosition = {
            x: currentX + index * offsetStep,
            y: currentY + index * offsetStep,
          };
          onAddImageNode(dataUrl, finalPosition);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [screenToFlowPosition, onAddImageNode]);

  return (
    <div
      ref={reactFlowWrapperRef}
      className="w-full bg-gray-50 dark:bg-gray-900/50 relative"
      style={{ height: 'calc(100vh - 64px)' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={handleInit}
        onMoveEnd={onMoveEnd}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineStyle={connectionLineStyle}
        snapToGrid={true}
        snapGrid={[20, 20]}
        minZoom={0.1}
        maxZoom={4}
        fitView={nodes.length > 0}
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode="Shift"
        zoomOnScroll={!scrollToPan}
        panOnScroll={scrollToPan}
        panOnDrag={true}
        className="touch-none"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#9ca3af"
        />
        <MiniMap
          nodeColor="#8b5cf6"
          maskColor="rgba(15, 23, 42, 0.7)"
          className="!bg-gray-100 dark:!bg-gray-800"
        />
        <Controls
          showInteractive={false}
          className="!bg-white/80 dark:!bg-gray-800/80 !border-gray-200 dark:!border-gray-700 !shadow-lg !rounded-lg"
        />
      </ReactFlow>

      {/* 拖拽覆盖层 */}
      {isDragOver && (
        <div className="absolute inset-0 bg-primary-500/20 border-2 border-dashed border-primary-500 z-20 flex items-center justify-center pointer-events-none">
          <div className="bg-white dark:bg-gray-800 px-6 py-4 rounded-lg shadow-xl">
            <p className="text-lg font-medium text-primary-600 dark:text-primary-400">
              松开鼠标导入图片
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              支持 JPG、PNG、GIF、WebP、SVG 等所有常见图片格式
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
