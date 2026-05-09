import { useCallback, useRef, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Viewport,
  type OnMoveEnd,
  type NodeTypes,
} from '@xyflow/react';
import { TextNode } from './nodes/TextNode';
import { ImageNode } from './nodes/ImageNode';
import { CodeNode } from './nodes/CodeNode';
import { DrawingCanvas, type DrawPath } from './DrawingCanvas';

const nodeTypes: NodeTypes = {
  planningText: TextNode,
  planningImage: ImageNode,
  planningCode: CodeNode,
};

interface PlanningCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onMoveEnd: OnMoveEnd;
  initialViewport?: Viewport;
  edgeTypes?: Record<string, React.ComponentType<any>>;
  onEdgeClick?: (event: React.MouseEvent, edge: Edge) => void;
  isDrawMode?: boolean;
  annotationPaths?: DrawPath[];
  onAnnotationChange?: (paths: DrawPath[]) => void;
  onAnnotationSave?: (base64: string) => void;
  allowZoomInDrawMode?: boolean;
}

export function PlanningCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onMoveEnd,
  initialViewport,
  edgeTypes = {},
  onEdgeClick,
  isDrawMode = false,
  annotationPaths,
  onAnnotationChange,
  onAnnotationSave,
  allowZoomInDrawMode = false,
}: PlanningCanvasProps) {
  const reactFlowRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // 测量容器尺寸
  useEffect(() => {
    const updateSize = () => {
      if (reactFlowRef.current) {
        setContainerSize({
          width: reactFlowRef.current.clientWidth,
          height: reactFlowRef.current.clientHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const defaultEdgeOptions = {
    type: 'planning-smoothstep' as const,
    style: { stroke: '#8b5cf6', strokeWidth: 2 },
    animated: false,
  };

  const connectionLineStyle = { stroke: '#8b5cf6', strokeWidth: 2 };

  const isValidConnection = useCallback((connection: Edge | Connection) => {
    return connection.source !== connection.target;
  }, []);

  const handleInit = useCallback(
    (instance: { fitView: () => void; setViewport: (vp: Viewport) => void }) => {
      if (initialViewport) {
        instance.setViewport(initialViewport);
      }
    },
    [initialViewport],
  );

  return (
    <div
      ref={reactFlowRef}
      className="relative w-full bg-gray-50 dark:bg-gray-900/50 overflow-hidden"
      style={{ height: 'calc(100vh - 64px)' }}
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
        isValidConnection={isValidConnection}
        snapToGrid={true}
        snapGrid={[20, 20]}
        minZoom={0.1}
        maxZoom={4}
        fitView={nodes.length > 0}
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode="Shift"
        panActivationKeyCode={isDrawMode ? undefined : 'Space'}
        panOnDrag={!isDrawMode}
        panOnRightClick={!isDrawMode}
        panOnMiddleClick={!isDrawMode}
        panOnScroll={!isDrawMode}
        zoomOnScroll={allowZoomInDrawMode ? true : !isDrawMode}
        zoomOnDoubleClick={!isDrawMode}
        zoomOnPinch={!isDrawMode}
        nodesDraggable={!isDrawMode}
        nodesConnectable={!isDrawMode}
        elementsSelectable={!isDrawMode}
        className={`touch-none ${isDrawMode ? 'cursor-crosshair' : ''}`}
        paneClassName={isDrawMode ? 'cursor-crosshair' : 'cursor-default'}
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
      </ReactFlow>

      {/* 全局标注层 - 启用画笔时覆盖整个视图 */}
      {isDrawMode && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10000 }}>
          <DrawingCanvas
            width={containerSize.width}
            height={containerSize.height}
            isDrawingMode={isDrawMode}
            initialPaths={annotationPaths}
            onDrawingChange={onAnnotationChange}
            onSave={onAnnotationSave}
          />
        </div>
      )}
    </div>
  );
}
