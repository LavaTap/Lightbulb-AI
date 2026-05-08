import { useCallback, useEffect, useRef } from 'react';
import {
  useNodesState,
  useEdgesState,
  addEdge,
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
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'smoothstep',
            style: { stroke: '#8b5cf6', strokeWidth: 2 },
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  const addTextNode = useCallback(
    (position?: { x: number; y: number }) => {
      const id = `text-${crypto.randomUUID()}`;
      const newNode: Node = {
        id,
        type: 'planningText',
        position: position || {
          x: -viewportRef.current.x / viewportRef.current.zoom + 200,
          y: -viewportRef.current.y / viewportRef.current.zoom + 200,
        },
        data: { text: '双击编辑' },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes],
  );

  const addImageNode = useCallback(
    (imageSrc: string, position?: { x: number; y: number }) => {
      const id = `image-${crypto.randomUUID()}`;
      const newNode: Node = {
        id,
        type: 'planningImage',
        position: position || {
          x: -viewportRef.current.x / viewportRef.current.zoom + 200,
          y: -viewportRef.current.y / viewportRef.current.zoom + 200,
        },
        data: { imageSrc, alt: 'Image' },
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
    deleteSelected,
    updateNodeText,
    setViewport,
    viewportRef,
  };
}
