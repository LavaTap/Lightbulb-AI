import { useCallback } from 'react';
import { ReactFlowProvider, useReactFlow, type Viewport } from '@xyflow/react';
import { PlanningCanvas } from '@/components/planning/PlanningCanvas';
import { PlanningToolbar } from '@/components/planning/PlanningToolbar';
import { usePlanningState } from '@/hooks/usePlanningState';

function PlanningPageInner() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addTextNode,
    addImageNode,
    deleteSelected,
    setViewport,
    viewportRef,
  } = usePlanningState();

  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const handleMoveEnd = useCallback(
    (_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      setViewport(viewport);
    },
    [setViewport],
  );

  return (
    <div className="relative">
      <PlanningToolbar
        onAddTextNode={addTextNode}
        onAddImageNode={addImageNode}
        onDeleteSelected={deleteSelected}
        onFitView={() => fitView({ padding: 0.2 })}
        onZoomIn={() => zoomIn()}
        onZoomOut={() => zoomOut()}
      />
      <PlanningCanvas
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onMoveEnd={handleMoveEnd}
        initialViewport={viewportRef.current}
      />
    </div>
  );
}

export function PlanningPage() {
  return (
    <ReactFlowProvider>
      <PlanningPageInner />
    </ReactFlowProvider>
  );
}
