import axios, { AxiosInstance } from 'axios';
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  GenerateImageRequest,
  GenerateImageResponse,
  GeneratePosterRequest,
  GeneratePosterResponse,
  GenerateStoryboardRequest,
  GenerateStoryboardResponse,
  GenerateStoryboardPromptRequest,
  GenerateStoryboardPromptResponse,
  RecordsResponse,
  CreateRecordRequest,
  ModelConfigsResponse,
  ModelConfigResponse,
  CreateModelConfigRequest,
  TestConnectionRequest,
  TestConnectionResponse,
  DetectCapabilitiesResponse,
  CreateConversationRequest,
  SendMessageRequest,
  ConversationsResponse,
  ConversationDetailResponse,
  UsageStatisticsResponse,
} from '@/types/api';
import type { APIConfig, MessageAttachment } from '@/types/index';

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'Network error';
    return Promise.reject(new Error(message));
  }
);

export const visionApi = {
  analyze: async (data: AnalyzeRequest): Promise<AnalyzeResponse> => {
    const response = await api.post('/vision/analyze', data);
    return response.data;
  },
};

export const imageApi = {
  generate: async (data: GenerateImageRequest): Promise<GenerateImageResponse> => {
    const response = await api.post('/image/generate', data);
    return response.data;
  },
};

export const posterApi = {
  generate: async (data: GeneratePosterRequest): Promise<GeneratePosterResponse> => {
    const response = await api.post('/poster/generate', data);
    return response.data;
  },
};

export const storyboardApi = {
  generate: async (data: GenerateStoryboardRequest): Promise<GenerateStoryboardResponse> => {
    const response = await api.post('/storyboard/generate', data);
    return response.data;
  },
};

export const storyboardPromptApi = {
  generate: async (data: GenerateStoryboardPromptRequest): Promise<GenerateStoryboardPromptResponse> => {
    const response = await api.post('/storyboard-prompt/generate', data);
    return response.data;
  },
};

export const recordsApi = {
  getAll: async (page = 1, pageSize = 20): Promise<RecordsResponse> => {
    const response = await api.get('/records', { params: { page, pageSize } });
    return response.data;
  },
  
  create: async (data: CreateRecordRequest): Promise<{ id: number }> => {
    const response = await api.post('/records', data);
    return response.data.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/records/${id}`);
  },

  getStatistics: async (period: 'week' | 'month' | 'year' | 'all' = 'week'): Promise<UsageStatisticsResponse> => {
    const response = await api.get('/records/statistics', { params: { period } });
    return response.data;
  },
};

export const modelConfigsApi = {
  getAll: async (): Promise<ModelConfigsResponse> => {
    const response = await api.get('/model-configs');
    return response.data;
  },
  
  getById: async (id: number): Promise<ModelConfigResponse> => {
    const response = await api.get(`/model-configs/${id}`);
    return response.data;
  },
  
  getActive: async (): Promise<ModelConfigResponse> => {
    const response = await api.get('/model-configs/active');
    return response.data;
  },
  
  create: async (data: CreateModelConfigRequest): Promise<{ id: number }> => {
    const response = await api.post('/model-configs', data);
    return response.data.data;
  },
  
  update: async (id: number, data: Partial<CreateModelConfigRequest>): Promise<void> => {
    await api.put(`/model-configs/${id}`, data);
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/model-configs/${id}`);
  },
  
  activate: async (id: number): Promise<void> => {
    await api.post(`/model-configs/${id}/activate`);
  },
  
  testConnection: async (data: TestConnectionRequest): Promise<TestConnectionResponse> => {
    const response = await api.post('/model-configs/test-connection', data);
    return response.data;
  },

  // 检测模型能力（vision / text-to-image / image-to-image）
  detectCapabilities: async (data: TestConnectionRequest): Promise<DetectCapabilitiesResponse> => {
    const response = await api.post('/model-configs/detect-capabilities', data);
    return response.data;
  },
};

export const chatApi = {
  getConversations: async (page = 1, pageSize = 20): Promise<ConversationsResponse> => {
    const response = await api.get('/chat/conversations', { params: { page, pageSize } });
    return response.data;
  },

  getConversation: async (id: number): Promise<ConversationDetailResponse> => {
    const response = await api.get(`/chat/conversations/${id}`);
    return response.data;
  },

  createConversation: async (data: CreateConversationRequest): Promise<any> => {
    const response = await api.post('/chat/conversations', data);
    return response.data.data;
  },

  updateConversation: async (id: number, data: { title?: string; systemPrompt?: string }): Promise<void> => {
    await api.put(`/chat/conversations/${id}`, data);
  },

  deleteConversation: async (id: number): Promise<void> => {
    await api.delete(`/chat/conversations/${id}`);
  },

  // SSE streaming - 使用原生 fetch，因为 axios 不支持流式响应
  sendMessage: async (conversationId: number, content: string, config: APIConfig, attachments?: MessageAttachment[], signal?: AbortSignal): Promise<Response> => {
    const body: any = { content, config };
    if (attachments && attachments.length > 0) {
      body.attachments = attachments;
    }
    return fetch(`/api/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  },

  triggerSummarize: async (conversationId: number, config: APIConfig): Promise<void> => {
    await api.post(`/chat/conversations/${conversationId}/summarize`, { config });
  },
};

// Character Chat API
export const characterChatApi = {
  // Characters
  getCharacters: async () => {
    const response = await api.get('/character-chat/characters');
    return response.data;
  },

  getCharacter: async (id: number) => {
    const response = await api.get(`/character-chat/characters/${id}`);
    return response.data;
  },

  createCharacter: async (data: any) => {
    const response = await api.post('/character-chat/characters', data);
    return response.data;
  },

  updateCharacter: async (id: number, data: any) => {
    const response = await api.put(`/character-chat/characters/${id}`, data);
    return response.data;
  },

  deleteCharacter: async (id: number) => {
    await api.delete(`/character-chat/characters/${id}`);
  },

  initPresets: async () => {
    const response = await api.post('/character-chat/init-presets');
    return response.data;
  },

  generatePersona: async (name: string, subtitle: string, basicInfo: string, config: APIConfig) => {
    const response = await api.post('/character-chat/generate-persona', { name, subtitle, basicInfo, config });
    return response.data;
  },

  // Conversations
  getConversations: async (characterId: number) => {
    const response = await api.get('/character-chat/conversations', { params: { characterId } });
    return response.data;
  },

  getConversation: async (id: number) => {
    const response = await api.get(`/character-chat/conversations/${id}`);
    return response.data;
  },

  createConversation: async (characterId: number, title?: string) => {
    const response = await api.post('/character-chat/conversations', { characterId, title });
    return response.data;
  },

  deleteConversation: async (id: number) => {
    await api.delete(`/character-chat/conversations/${id}`);
  },

  // SSE streaming for character chat
  sendMessage: async (conversationId: number, content: string, config: APIConfig, signal?: AbortSignal): Promise<Response> => {
    return fetch(`/api/character-chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, config }),
      signal,
    });
  },

  // Test Agent - SSE streaming
  runTest: async (config: APIConfig, signal?: AbortSignal): Promise<Response> => {
    return fetch('/api/character-chat/test/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
      signal,
    });
  },

  getTestRuns: async () => {
    const response = await api.get('/character-chat/test/runs');
    return response.data;
  },
};

export default api;
