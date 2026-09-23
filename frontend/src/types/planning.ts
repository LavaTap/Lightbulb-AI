import type { Node, Edge } from '@xyflow/react';

export type TextNodeData = {
  text: string;
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  showBackground?: boolean;
  onChange?: (id: string, text: string) => void;
  onStyleChange?: (id: string, styles: Partial<TextNodeData>) => void;
};

export type ImageNodeData = {
  imageSrc: string;
  alt?: string;
};

export type CodeNodeData = {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
};

export type PlanningEdgeData = {
  showArrow?: boolean;
  arrowStart?: boolean;
  arrowEnd?: boolean;
};

export type PlanningTextNodeType = Node<TextNodeData, 'planningText'>;
export type PlanningImageNodeType = Node<ImageNodeData, 'planningImage'>;
export type PlanningCodeNodeType = Node<CodeNodeData, 'planningCode'>;
export type PlanningNodeType = PlanningTextNodeType | PlanningImageNodeType | PlanningCodeNodeType;

export type PlanningEdgeType = Edge<PlanningEdgeData>;
