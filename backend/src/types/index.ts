export interface APIConfig {
  provider: 'openai' | 'google' | 'deepseek' | 'xfyun' | 'aliyun' | 'bytedance' | 'baidu' | 'tencent' | 'gptimage2' | 'custom';
  model: string;
  endpoint: string;
  apiKey: string;
  useProxy: boolean;
  proxyEndpoint: string;
}

export interface VisionAnalysisResult {
  analysis: { zh: string; en: string };
}

export interface GenerationRecord {
  id: number;
  featureType: 'inspiration' | 'chat' | 'character' | 'threeview' | 'poster' | 'storyboard';
  prompt?: string;
  uploadImages: string;
  generatedImages: string;
  uploadImagesOriginal?: string;    // 原图 base64
  generatedImagesOriginal?: string; // 原图 base64
  modelProvider: string;
  modelName: string;
  tokenUsage: number;
  createdAt: string;
}

export interface AnalyzeRequest {
  imageBase64: string;
  config: APIConfig;
}

export interface GenerateImageRequest {
  prompt: string;
  config: APIConfig;
  size?: '1024x1024' | '1024x1792' | '1792x1024';
}

export interface GeneratePosterRequest {
  images: string[];
  prompt: string;
  config: APIConfig;
}

export interface CreateRecordRequest {
  featureType: string;
  prompt?: string;
  uploadImages?: string;
  generatedImages?: string;
  modelProvider: string;
  modelName: string;
  tokenUsage: number;
}
