import { useCallback, useState, useEffect } from 'react';
import { ReactFlowProvider, useReactFlow, type Viewport, type Edge } from '@xyflow/react';
import { PlanningCanvas } from '@/components/planning/PlanningCanvas';
import { PlanningToolbar } from '@/components/planning/PlanningToolbar';
import { EdgeStylePopup } from '@/components/planning/EdgeStylePopup';
import { usePlanningState } from '@/hooks/usePlanningState';
import type { PlanningEdgeData } from '@/types/planning';

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
    deleteEdge,
    updateEdgeStyle,
    updateImageZoom,
    setViewport,
    viewportRef,
  } = usePlanningState();

  const { fitView, zoomIn, zoomOut } = useReactFlow();

  // 边样式弹窗状态
  const [showEdgePopup, setShowEdgePopup] = useState(false);
  const [edgePopupPosition, setEdgePopupPosition] = useState({ x: 0, y: 0 });
  const [currentEdge, setCurrentEdge] = useState<Edge<PlanningEdgeData> | null>(null);

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

  // 点击边弹出样式设置面板
  const handleEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.stopPropagation();
      setCurrentEdge(edge as Edge<PlanningEdgeData>);
      setEdgePopupPosition({ x: event.clientX, y: event.clientY });
      setShowEdgePopup(true);
    },
    [],
  );

  // 更新边样式
  const handleEdgeStyleUpdate = useCallback(
    (edgeId: string, updates: { type?: string; showArrow?: boolean; arrowStart?: boolean; arrowEnd?: boolean }) => {
      updateEdgeStyle(edgeId, updates);
      // 同步更新 currentEdge 的本地状态
      setCurrentEdge((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          type: (updates.type as any) || prev.type,
          data: {
            ...prev.data,
            ...updates,
          },
        };
      });
    },
    [updateEdgeStyle],
  );

  // 删除边
  const handleEdgeDelete = useCallback(
    (edgeId: string) => {
      deleteEdge(edgeId);
      setCurrentEdge(null);
    },
    [deleteEdge],
  );

  // 关闭边样式弹窗
  const handleCloseEdgePopup = useCallback(() => {
    setShowEdgePopup(false);
    setCurrentEdge(null);
  }, []);

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
        onEdgeClick={handleEdgeClick}
        initialViewport={viewportRef.current}
        scrollToPan={scrollToPan}
      />

      {showEdgePopup && currentEdge && (
        <EdgeStylePopup
          edgeId={currentEdge.id}
          position={edgePopupPosition}
          currentType={(currentEdge.type as 'planning-smoothstep' | 'planning-bezier' | 'planning-straight') || 'planning-smoothstep'}
          currentShowArrow={currentEdge.data?.showArrow || false}
          currentArrowStart={currentEdge.data?.arrowStart || false}
          currentArrowEnd={currentEdge.data?.arrowEnd || false}
          onUpdate={handleEdgeStyleUpdate}
          onDelete={handleEdgeDelete}
          onClose={handleCloseEdgePopup}
        />
      )}
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
