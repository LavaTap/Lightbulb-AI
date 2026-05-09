import { useCallback, useState, useEffect, useRef } from 'react';
import { ReactFlowProvider, useReactFlow, type Viewport, type Edge } from '@xyflow/react';
import { PlanningCanvas } from '@/components/planning/PlanningCanvas';
import { PlanningToolbar } from '@/components/planning/PlanningToolbar';
import { EdgeStylePopup } from '@/components/planning/EdgeStylePopup';
import {
  PlanningSmoothstepEdge,
  PlanningBezierEdge,
  PlanningStraightEdge,
} from '@/components/planning/edges/PlanningEdge';
import { usePlanningState } from '@/hooks/usePlanningState';
import type { PlanningEdgeData } from '@/types/planning';
import type { DrawPath } from '@/components/planning/DrawingCanvas';

function PlanningPageInner() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addTextNode,
    addImageNode,
    addCodeNode,
    deleteSelected,
    deleteEdge,
    updateEdgeStyle,
    updateImageZoom,
    setViewport,
    viewportRef,
  } = usePlanningState();

  // 画笔模式状态
  const [isDrawMode, setIsDrawMode] = useState(false);

  // 全局标注路径
  const [annotationPaths, setAnnotationPaths] = useState<DrawPath[]>([]);

  // 画笔模式下是否允许滚轮缩放
  const [allowZoomInDrawMode, setAllowZoomInDrawMode] = useState(false);

  // 切换画笔模式
  const handleToggleDrawMode = useCallback(() => {
    setIsDrawMode((prev) => !prev);
    // 退出画笔模式时关闭缩放锁定
    setAllowZoomInDrawMode(false);
  }, []);

  // 切换画笔模式下的滚轮缩放
  const handleToggleZoomLock = useCallback(() => {
    setAllowZoomInDrawMode((prev) => !prev);
  }, []);

  // 标注路径变化处理
  const handleAnnotationChange = useCallback((paths: DrawPath[]) => {
    setAnnotationPaths(paths);
  }, []);

  // 保存标注画布为图片节点
  const handleAnnotationSave = useCallback((base64: string) => {
    addImageNode(base64);
  }, [addImageNode]);

  const { fitView, zoomIn, zoomOut, flowToScreenPosition, screenToFlowPosition } = useReactFlow();

  const [showEdgePopup, setShowEdgePopup] = useState(false);
  const [edgePopupPosition, setEdgePopupPosition] = useState({ x: 0, y: 0 });
  const [currentEdge, setCurrentEdge] = useState<Edge<PlanningEdgeData> | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // 选中图片状态
  const [selectedImageNode, setSelectedImageNode] = useState<{ id: string; zoomLevel: number } | null>(null);

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

  const edgeTypes = {
    'planning-smoothstep': PlanningSmoothstepEdge,
    'planning-bezier': PlanningBezierEdge,
    'planning-straight': PlanningStraightEdge,
  };

  const handleMoveEnd = useCallback(
    (_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      setViewport(viewport);
    },
    [setViewport],
  );

  const handleConnect = useCallback(
    (connection: Parameters<typeof onConnect>[0]) => {
      const newEdgeId = onConnect(connection);

      // 直接构建边数据（edges 状态还未更新，不能用 edges.find）
      const newEdge: Edge<PlanningEdgeData> = {
        id: newEdgeId,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        type: 'planning-smoothstep',
        data: { showArrow: false },
      };

      // 计算连线中点的屏幕坐标
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      if (sourceNode && targetNode) {
        const midFlowX = (sourceNode.position.x + targetNode.position.x) / 2;
        const midFlowY = (sourceNode.position.y + targetNode.position.y) / 2;
        const screenPos = flowToScreenPosition({ x: midFlowX, y: midFlowY });
        setEdgePopupPosition(screenPos);
      } else {
        setEdgePopupPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      }

      setCurrentEdge(newEdge);
      setShowEdgePopup(true);
    },
    [onConnect, nodes, flowToScreenPosition],
  );

  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    const edgeWithData = edge as Edge<PlanningEdgeData>;

    // 用鼠标点击的屏幕坐标定位
    setEdgePopupPosition({ x: event.clientX, y: event.clientY });
    setCurrentEdge(edgeWithData);
    setShowEdgePopup(true);
  }, []);

  const handleEdgeStyleUpdate = useCallback(
    (edgeId: string, updates: { type?: string; showArrow?: boolean; arrowStart?: boolean; arrowEnd?: boolean }) => {
      updateEdgeStyle(edgeId, updates);
    },
    [updateEdgeStyle],
  );

  const handleEdgeDelete = useCallback(
    (edgeId: string) => {
      deleteEdge(edgeId);
    },
    [deleteEdge],
  );

  const handleCloseEdgePopup = useCallback(() => {
    setShowEdgePopup(false);
    setCurrentEdge(null);
  }, []);

  // 边样式更新后同步 currentEdge 状态（让 popup 选项实时反映）
  useEffect(() => {
    if (currentEdge) {
      const updated = edges.find((e) => e.id === currentEdge.id);
      if (updated && updated !== currentEdge) {
        setCurrentEdge(updated as Edge<PlanningEdgeData>);
      }
    }
  }, [edges, currentEdge]);

  // 图片拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => 
      file.type.startsWith('image/') || 
      file.name.endsWith('.svg') ||
      file.name.endsWith('.png') ||
      file.name.endsWith('.jpg') ||
      file.name.endsWith('.jpeg') ||
      file.name.endsWith('.gif') ||
      file.name.endsWith('.webp')
    );

    if (imageFiles.length === 0) return;

    // 获取拖拽位置
    const rect = dropZoneRef.current?.getBoundingClientRect();
    if (!rect) return;

    const dropX = e.clientX - rect.left;
    const dropY = e.clientY - rect.top;
    
    // 将屏幕坐标转换为画布坐标
    const flowPosition = screenToFlowPosition({ x: dropX, y: dropY });

    // 处理每个图片文件
    imageFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          // 稍微偏移每个图片的位置，避免重叠
          const offset = index * 20;
          addImageNode(dataUrl, {
            x: flowPosition.x + offset,
            y: flowPosition.y + offset,
          });
        }
      };
      reader.readAsDataURL(file);
    });
  }, [addImageNode, screenToFlowPosition]);

  // 添加拖拽事件监听
  useEffect(() => {
    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleGlobalDrop = (e: DragEvent) => {
      e.preventDefault();
    };

    document.addEventListener('dragover', handleGlobalDragOver);
    document.addEventListener('drop', handleGlobalDrop);

    return () => {
      document.removeEventListener('dragover', handleGlobalDragOver);
      document.removeEventListener('drop', handleGlobalDrop);
    };
  }, []);

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

  return (
    <div 
      ref={dropZoneRef}
      className="relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <PlanningToolbar
        onAddTextNode={addTextNode}
        onAddImageNode={addImageNode}
        onAddCodeNode={addCodeNode}
        onDeleteSelected={deleteSelected}
        onFitView={() => fitView({ padding: 0.2 })}
        onZoomIn={() => zoomIn()}
        onZoomOut={() => zoomOut()}
        onToggleDrawMode={handleToggleDrawMode}
        isDrawMode={isDrawMode}
        onToggleZoomLock={handleToggleZoomLock}
        isZoomLocked={allowZoomInDrawMode}
        selectedImageNode={selectedImageNode}
        onUpdateImageZoom={handleUpdateImageZoom}
      />
      <PlanningCanvas
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onMoveEnd={handleMoveEnd}
        onEdgeClick={handleEdgeClick}
        initialViewport={viewportRef.current}
        edgeTypes={edgeTypes}
        isDrawMode={isDrawMode}
        annotationPaths={annotationPaths}
        onAnnotationChange={handleAnnotationChange}
        onAnnotationSave={handleAnnotationSave}
        allowZoomInDrawMode={allowZoomInDrawMode}
      />
      
      {/* 拖拽提示 */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-primary-500/10 border-2 border-dashed border-primary-500 rounded-xl p-8 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-4xl mb-2">📁</div>
              <p className="text-lg font-medium text-primary-700 dark:text-primary-300">
                拖拽图片到此处
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                支持 PNG, JPEG, SVG, GIF, WebP 格式
              </p>
            </div>
          </div>
        </div>
      )}

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
