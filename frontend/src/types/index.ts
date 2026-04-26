export interface APIConfig {
  provider: 'openai' | 'google' | 'deepseek' | 'xfyun' | 'aliyun' | 'bytedance' | 'baidu' | 'custom';
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
  category?: string;  // 分析类型
}

// 分析类别类型
export type AnalysisCategory = 'character' | 'landscape' | 'object' | 'other';

export type FeatureType = 'inspiration' | 'character' | 'threeview' | 'poster' | 'cg';

// Model capability categories
export type ModelCategory = 'vision' | 'text-to-image' | 'image-to-image';

// Model configuration for storage
export interface ModelConfig {
  id: number;
  name: string;
  provider: 'openai' | 'google' | 'deepseek' | 'xfyun' | 'aliyun' | 'bytedance' | 'baidu' | 'custom';
  model: string;
  apiKey?: string;
  endpoint?: string;
  useProxy: boolean;
  proxyEndpoint?: string;
  category: ModelCategory;
  capabilities: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Provider info with supported models and capabilities
export interface ProviderInfo {
  id: string;
  name: string;
  models: {
    id: string;
    name: string;
    category: ModelCategory;
    capabilities: string[];
    description?: string;
  }[];
}
