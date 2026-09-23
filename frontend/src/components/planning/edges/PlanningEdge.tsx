import { BaseEdge, getSmoothStepPath, getBezierPath, getStraightPath, type EdgeProps } from '@xyflow/react';

const ARROW_MARKER_START_ID = 'planning-edge-arrow-start';
const ARROW_MARKER_END_ID = 'planning-edge-arrow-end';

type EdgeData = { 
  showArrow?: boolean;
  arrowStart?: boolean;
  arrowEnd?: boolean;
};

interface PlanningEdgeProps extends EdgeProps {
  type: 'planning-smoothstep' | 'planning-bezier' | 'planning-straight';
  data?: EdgeData;
}

export function PlanningEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  type,
}: PlanningEdgeProps) {
  let path: string;

  switch (type) {
    case 'planning-bezier': {
      [path] = getBezierPath({
        sourceX, sourceY, sourcePosition,
        targetX, targetY, targetPosition,
      });
      break;
    }
    case 'planning-straight': {
      [path] = getStraightPath({ sourceX, sourceY, targetX, targetY });
      break;
    }
    case 'planning-smoothstep':
    default: {
      [path] = getSmoothStepPath({
        sourceX, sourceY, sourcePosition,
        targetX, targetY, targetPosition,
      });
      break;
    }
  }

  const edgeData = data as EdgeData | undefined;
  const showArrow = edgeData?.showArrow;
  const arrowStart = edgeData?.arrowStart ?? false;
  const arrowEnd = edgeData?.arrowEnd ?? (showArrow ?? false);
  
  const edgeMarkerStart = arrowStart ? `url(#${ARROW_MARKER_START_ID})` : undefined;
  const edgeMarkerEnd = arrowEnd ? `url(#${ARROW_MARKER_END_ID})` : undefined;

  return (
    <>
      {(arrowStart || arrowEnd) && (
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            {/* 起始箭头 */}
            <marker
              id={ARROW_MARKER_START_ID}
              markerWidth="10"
              markerHeight="7"
              refX="1"
              refY="3.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon
                points="10 0, 0 3.5, 10 7"
                fill="#8b5cf6"
              />
            </marker>
            {/* 结束箭头 */}
            <marker
              id={ARROW_MARKER_END_ID}
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#8b5cf6"
              />
            </marker>
          </defs>
        </svg>
      )}
      <BaseEdge
        path={path}
        markerStart={edgeMarkerStart}
        markerEnd={edgeMarkerEnd}
        style={{ stroke: '#8b5cf6', strokeWidth: 2 }}
      />
    </>
  );
}

export function PlanningSmoothstepEdge(props: EdgeProps) {
  return <PlanningEdge {...props} type="planning-smoothstep" />;
}

export function PlanningBezierEdge(props: EdgeProps) {
  return <PlanningEdge {...props} type="planning-bezier" />;
}

export function PlanningStraightEdge(props: EdgeProps) {
  return <PlanningEdge {...props} type="planning-straight" />;
}