import type { Node } from '@xyflow/react';

export type TextNodeData = {
  text: string;
  color?: string;
  onChange?: (id: string, text: string) => void;
};

export type ImageNodeData = {
  imageSrc: string;
  alt?: string;
};

export type PlanningTextNodeType = Node<TextNodeData, 'planningText'>;
export type PlanningImageNodeType = Node<ImageNodeData, 'planningImage'>;
export type PlanningNodeType = PlanningTextNodeType | PlanningImageNodeType;
