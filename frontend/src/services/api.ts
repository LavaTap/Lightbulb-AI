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
    const response = await api.post('/generate/storyboard/generate', data);
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

export default api;
