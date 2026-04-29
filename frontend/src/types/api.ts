import type { APIConfig, VisionAnalysisResult, ModelConfig } from './index';

export type AnalysisCategory = 'character' | 'landscape' | 'object' | 'other';

export interface AnalyzeRequest {
  imageBase64: string;
  config: APIConfig;
  category?: AnalysisCategory;  // 分析类型：character/landscape/object/other，角色类型会额外分析比例
}

export interface AnalyzeResponse {
  success: boolean;
  data: VisionAnalysisResult;
  tokenUsage: number;
}

export interface GenerateImageRequest {
  prompt: string;
  config: APIConfig;
  size?: '1024x1024' | '1024x1792' | '1792x1024';
  referenceImage?: string;  // 可选参考图 base64，用于图生图
}

export interface GenerateImageResponse {
  success: boolean;
  data: { imageBase64: string };
  tokenUsage: number;
}

export interface GeneratePosterRequest {
  images: string[];
  prompt: string;
  config: APIConfig;
}

export interface GeneratePosterResponse {
  success: boolean;
  data: { imageBase64: string };
  tokenUsage: number;
}

export interface RecordsResponse {
  success: boolean;
  data: {
    records: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface CreateRecordRequest {
  featureType: string;
  prompt?: string;
  uploadImages?: string;
  generatedImages?: string;
  uploadImagesOriginal?: string;   // 原图 base64
  generatedImagesOriginal?: string; // 原图 base64
  modelProvider: string;
  modelName: string;
  tokenUsage: number;
}

// Model Config API types
export interface ModelConfigsResponse {
  success: boolean;
  data: ModelConfig[];
}

export interface ModelConfigResponse {
  success: boolean;
  data: ModelConfig | null;
}

export interface CreateModelConfigRequest {
  name: string;
  provider: string;
  model: string;
  apiKey?: string;
  endpoint?: string;
  useProxy?: boolean;
  proxyEndpoint?: string;
  category?: string;
  capabilities?: string[];
  isActive?: boolean;
}

export interface TestConnectionRequest {
  provider: string;
  apiKey: string;
  model: string;
  endpoint?: string;
  useProxy?: boolean;
  proxyEndpoint?: string;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
}

// 模型能力检测
export interface DetectCapabilitiesResponse {
  success: boolean;
  data: {
    capabilities: string[];
    category: 'vision' | 'text-to-image' | 'image-to-image';
  };
}
