export interface APIConfig {
  provider: 'openai' | 'google' | 'deepseek' | 'xfyun' | 'aliyun' | 'bytedance' | 'baidu' | 'tencent' | 'gptimage2' | 'custom';
  model: string;
  endpoint: string;
  apiKey: string;
  useProxy: boolean;
  proxyEndpoint: string;
}

export interface GenerationRecord {
  id: number;
  featureType: 'inspiration' | 'chat' | 'character' | 'threeview' | 'poster';
  prompt?: string;
  uploadImages: string[];
  generatedImages: string[];
  uploadImagesOriginal?: string[];   // 原图 base64 数组
  generatedImagesOriginal?: string[]; // 原图 base64 数组
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

export type FeatureType = 'inspiration' | 'chat' | 'character' | 'threeview' | 'poster' | 'cg';

// Model capability categories
export type ModelCategory = 'vision' | 'text-to-image' | 'image-to-image' | 'text';

// Model configuration for storage
export interface ModelConfig {
  id: number;
  name: string;
  provider: 'openai' | 'google' | 'deepseek' | 'xfyun' | 'aliyun' | 'bytedance' | 'baidu' | 'tencent' | 'gptimage2' | 'custom';
  model: string;
  apiKey?: string;
  endpoint?: string;
  useProxy: boolean;
  proxyEndpoint?: string;
  category: ModelCategory | ModelCategory[];  // 支持多类别
  capabilities: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Chat types
export interface Conversation {
  id: number;
  title: string;
  modelProvider: string;
  modelName: string;
  systemPrompt?: string;
  summary?: string;
  messageCount: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  role: 'system' | 'user' | 'assistant';
  content: string;
  tokenUsage: number;
  createdAt: string;
}

// Provider info with supported models and capabilities
export interface ProviderInfo {
  id: string;
  name: string;
  models: {
    id: string;
    name: string;
    category: ModelCategory | ModelCategory[];  // 支持单类别或多类别
    capabilities: string[];
    description?: string;
  }[];
}
