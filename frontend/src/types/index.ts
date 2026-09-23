/** 宽高比字符串，如 '1:1'、'9:16'；自定义时仍为像素格式 '1024x1024' */
export type ImageSize = string;

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
  featureType: 'inspiration' | 'chat' | 'character' | 'threeview' | 'poster' | 'storyboard';
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

export type FeatureType = 'inspiration' | 'chat' | 'character' | 'threeview' | 'poster' | 'storyboard' | 'storyboard-prompt' | 'cg' | 'planning' | 'materials' | 'statistics' | 'character-chat';

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

export interface MessageAttachment {
  type: 'image' | 'file';
  dataBase64: string;
  mimeType: string;
  fileName: string;
  width?: number;
  height?: number;
  fileSize?: number;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  role: 'system' | 'user' | 'assistant';
  content: string;
  attachments?: MessageAttachment[];
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

// Character Chat types
export interface GameCharacter {
  id: number;
  name: string;
  avatarColor: string;
  subtitle: string | null;
  identity: string;
  sceneSetting: string;
  languageStyle: string;
  behaviorRules: string;
  systemPrompt: string;
  isPreset: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterConversation {
  id: number;
  characterId: number;
  title: string;
  messageCount: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterChatMessage {
  id: number;
  conversationId: number;
  characterId: number;
  role: 'user' | 'assistant';
  content: string;
  emotion: string | null;
  emotionIntensity: number | null;
  tokenUsage: number;
  createdAt: string;
}

// Emotion colors and labels
export const EMOTION_CONFIG: Record<string, { color: string; label: string }> = {
  '开心': { color: '#00b894', label: '开心' },
  '伤心': { color: '#74b9ff', label: '伤心' },
  '生气': { color: '#ff6b6b', label: '生气' },
  '兴奋': { color: '#fdcb6e', label: '兴奋' },
  '担忧': { color: '#fab1a0', label: '担忧' },
  '害羞': { color: '#fd79a8', label: '害羞' },
  '冷静': { color: '#81ecec', label: '冷静' },
  '惊讶': { color: '#ffeaa7', label: '惊讶' },
  '困惑': { color: '#dfe6e9', label: '困惑' },
  '骄傲': { color: '#e17055', label: '骄傲' },
  '恐惧': { color: '#b2bec3', label: '恐惧' },
  '中性': { color: '#a0a4b8', label: '中性' },
};
