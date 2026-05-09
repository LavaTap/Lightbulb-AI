import { useCallback, useState, useEffect } from 'react';
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
    updateImageZoom,
    setViewport,
    viewportRef,
  } = usePlanningState();

  const { fitView, zoomIn, zoomOut } = useReactFlow();

  // 选中图片状态
  const [selectedImageNode, setSelectedImageNode] = useState<{ id: string; zoomLevel: number } | null>(null);

  // 滚动平移模式（锁定缩放，滚轮滚动画布）
  const [scrollToPan, setScrollToPan] = useState(false);

  const handleToggleScrollPan = useCallback(() => {
    setScrollToPan((prev) => !prev);
  }, []);

  // 监听节点选中状态变化
  useEffect(() => {
    const selectedImageNodes = nodes.filter(
      (n) => n.type === 'planningImage' && n.selected
    );
    if (selectedImageNodes.length > 0) {
      const imageNode = selectedImageNodes[0];
      setSelectedImageNode({
        id: imageNode.id,
        zoomLevel: (imageNode.data as { zoomLevel?: number }).zoomLevel || 100,
      });
    } else {
      setSelectedImageNode(null);
    }
  }, [nodes]);

  // 更新选中图片的缩放
  const handleUpdateImageZoom = useCallback(
    (zoomLevel: number) => {
      if (selectedImageNode) {
        updateImageZoom(selectedImageNode.id, zoomLevel);
        setSelectedImageNode((prev) => (prev ? { ...prev, zoomLevel } : null));
      }
    },
    [selectedImageNode, updateImageZoom],
  );

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
        selectedImageNode={selectedImageNode}
        onUpdateImageZoom={handleUpdateImageZoom}
        onToggleScrollPan={handleToggleScrollPan}
        isScrollPan={scrollToPan}
      />
      <PlanningCanvas
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onMoveEnd={handleMoveEnd}
        initialViewport={viewportRef.current}
        scrollToPan={scrollToPan}
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
