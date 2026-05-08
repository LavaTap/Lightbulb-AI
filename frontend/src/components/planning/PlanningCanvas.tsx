import { useCallback, useRef } from 'react';
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
} from '@xyflow/react';
import { TextNode } from './nodes/TextNode';
import { ImageNode } from './nodes/ImageNode';

const nodeTypes: NodeTypes = {
  planningText: TextNode,
  planningImage: ImageNode,
};

interface PlanningCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onMoveEnd: OnMoveEnd;
  initialViewport?: Viewport;
}

export function PlanningCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onMoveEnd,
  initialViewport,
}: PlanningCanvasProps) {
  const reactFlowRef = useRef<HTMLDivElement>(null);

  const defaultEdgeOptions = {
    type: 'smoothstep' as const,
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

  return (
    <div
      ref={reactFlowRef}
      className="w-full bg-gray-50 dark:bg-gray-900/50"
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
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineStyle={connectionLineStyle}
        snapToGrid={true}
        snapGrid={[20, 20]}
        minZoom={0.1}
        maxZoom={4}
        fitView={nodes.length > 0}
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode="Shift"
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
    </div>
  );
}
