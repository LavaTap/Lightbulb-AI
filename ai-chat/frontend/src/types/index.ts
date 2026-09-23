export interface APIConfig {
  provider: 'openai' | 'google' | 'deepseek' | 'xfyun' | 'aliyun' | 'bytedance' | 'baidu' | 'tencent' | 'gptimage2' | 'custom';
  model: string;
  endpoint: string;
  apiKey: string;
  useProxy: boolean;
  proxyEndpoint: string;
}

export type ModelCategory = 'vision' | 'text-to-image' | 'image-to-image' | 'text';

export interface ModelConfig {
  id: number;
  name: string;
  provider: 'openai' | 'google' | 'deepseek' | 'xfyun' | 'aliyun' | 'bytedance' | 'baidu' | 'tencent' | 'gptimage2' | 'custom';
  model: string;
  apiKey?: string;
  endpoint?: string;
  useProxy: boolean;
  proxyEndpoint?: string;
  category: ModelCategory | ModelCategory[];
  capabilities: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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
