export interface APIConfig {
  provider: 'openai' | 'google' | 'deepseek' | 'xfyun' | 'custom';
  model: string;
  endpoint: string;
  apiKey: string;
  useProxy: boolean;
  proxyEndpoint: string;
}

export interface GenerationRecord {
  id: number;
  featureType: 'inspiration' | 'character' | 'threeview' | 'poster';
  prompt?: string;
  uploadImages: string[];
  generatedImages: string[];
  modelProvider: string;
  modelName: string;
  tokenUsage: number;
  createdAt: string;
}

export interface VisionAnalysisResult {
  analysis: { zh: string; en: string };
}

export type FeatureType = 'inspiration' | 'character' | 'threeview' | 'poster' | 'cg';
