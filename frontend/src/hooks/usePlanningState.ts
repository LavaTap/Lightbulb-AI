import { useCallback, useEffect, useRef } from 'react';
import {
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type Viewport,
} from '@xyflow/react';

const STORAGE_KEY = 'lightbulb_planning_canvas';
const SAVE_DEBOUNCE_MS = 500;

interface PlanningCanvasState {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
}

export function usePlanningState() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const viewportRef = useRef<Viewport>({ x: 0, y: 0, zoom: 1 });
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadRef = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state: PlanningCanvasState = JSON.parse(saved);
        setNodes(state.nodes);
        setEdges(state.edges);
        if (state.viewport) {
          viewportRef.current = state.viewport;
        }
      }
    } catch (e) {
      console.warn('Failed to load planning canvas state:', e);
    }
    initialLoadRef.current = true;
  }, []);

  // Debounced save to localStorage
  const saveState = useCallback(() => {
    if (!initialLoadRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        const state: PlanningCanvasState = {
          nodes,
          edges,
          viewport: viewportRef.current,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.warn('Failed to save planning canvas state:', e);
      }
    }, SAVE_DEBOUNCE_MS);
  }, [nodes, edges]);

  // Auto-save when nodes or edges change
  useEffect(() => {
    saveState();
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [saveState]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdgeId = `edge-${crypto.randomUUID()}`;
      const newEdge: Edge = {
        id: newEdgeId,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'planning-smoothstep',
        data: { showArrow: false, arrowStart: false, arrowEnd: false },
        style: { stroke: '#8b5cf6', strokeWidth: 2 },
      };

      setEdges((eds) => [...eds, newEdge]);
      return newEdgeId;
    },
    [setEdges],
  );

  const addTextNode = useCallback(
    (position?: { x: number; y: number }) => {
      const id = `text-${crypto.randomUUID()}`;
      // 计算用户视图中心位置
      const viewportCenter = {
        x: -viewportRef.current.x / viewportRef.current.zoom,
        y: -viewportRef.current.y / viewportRef.current.zoom,
      };
      
      const newNode: Node = {
        id,
        type: 'planningText',
        position: position || viewportCenter,
        data: { 
          text: '双击编辑',
          color: '#000000',
          backgroundColor: '#ffffff',
          fontSize: 14,
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none',
          showBackground: false
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes],
  );

  const addImageNode = useCallback(
    (imageSrc: string, position?: { x: number; y: number }) => {
      const id = `image-${crypto.randomUUID()}`;
      // 计算用户视图中心位置
      const viewportCenter = {
        x: -viewportRef.current.x / viewportRef.current.zoom,
        y: -viewportRef.current.y / viewportRef.current.zoom,
      };
      
      const newNode: Node = {
        id,
        type: 'planningImage',
        position: position || viewportCenter,
        data: { imageSrc, alt: 'Image' },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes],
  );

  const addCodeNode = useCallback(
    (code: string, language: string = 'javascript', position?: { x: number; y: number }) => {
      const id = `code-${crypto.randomUUID()}`;
      // 计算用户视图中心位置
      const viewportCenter = {
        x: -viewportRef.current.x / viewportRef.current.zoom,
        y: -viewportRef.current.y / viewportRef.current.zoom,
      };
      
      const newNode: Node = {
        id,
        type: 'planningCode',
        position: position || viewportCenter,
        data: { 
          code: code || '// 在这里输入代码\nconsole.log("Hello, World!");',
          language,
          showLineNumbers: true
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes],
  );

  const deleteSelected = useCallback(() => {
    setNodes((nds) => {
      const remainingIds = new Set(nds.filter((n) => !n.selected).map((n) => n.id));
      setEdges((eds) => eds.filter((e) => !e.selected && remainingIds.has(e.source) && remainingIds.has(e.target)));
      return nds.filter((n) => !n.selected);
    });
  }, [setNodes, setEdges]);

  const updateNodeText = useCallback(
    (id: string, text: string) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, text } } : n)),
      );
    },
    [setNodes],
  );

  const setViewport = useCallback((viewport: Viewport) => {
    viewportRef.current = viewport;
  }, []);

  const updateEdgeStyle = useCallback((edgeId: string, updates: { type?: string; showArrow?: boolean; arrowStart?: boolean; arrowEnd?: boolean }) => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === edgeId) {
          const updatedEdge = { ...edge };
          if (updates.type) {
            updatedEdge.type = updates.type;
          }
          if (updates.showArrow !== undefined) {
            updatedEdge.data = { ...updatedEdge.data, showArrow: updates.showArrow };
          }
          if (updates.arrowStart !== undefined) {
            updatedEdge.data = { ...updatedEdge.data, arrowStart: updates.arrowStart };
          }
          if (updates.arrowEnd !== undefined) {
            updatedEdge.data = { ...updatedEdge.data, arrowEnd: updates.arrowEnd };
          }
          return updatedEdge;
        }
        return edge;
      }),
    );
  }, [setEdges]);

  const deleteEdge = useCallback((edgeId: string) => {
    setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
  }, [setEdges]);

  const updateImageZoom = useCallback((imageNodeId: string, zoomLevel: number) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === imageNodeId) {
          return { ...n, data: { ...n.data, zoomLevel } };
        }
        return n;
      }),
    );
  }, [setNodes]);

  return {
    nodes,
    edges,
    onNodesChange: (changes: NodeChange[]) => {
      onNodesChange(changes);
    },
    onEdgesChange: (changes: EdgeChange[]) => {
      onEdgesChange(changes);
    },
    onConnect,
    addTextNode,
    addImageNode,
    addCodeNode,
    deleteSelected,
    deleteEdge,
    updateNodeText,
    updateEdgeStyle,
    updateImageZoom,
    setViewport,
    viewportRef,
  };
}
