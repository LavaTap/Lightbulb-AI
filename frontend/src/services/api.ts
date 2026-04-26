import axios, { AxiosInstance } from 'axios';
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  GenerateImageRequest,
  GenerateImageResponse,
  GeneratePosterRequest,
  GeneratePosterResponse,
  RecordsResponse,
  CreateRecordRequest,
  ModelConfigsResponse,
  ModelConfigResponse,
  CreateModelConfigRequest,
  TestConnectionRequest,
  TestConnectionResponse,
  DetectCapabilitiesResponse,
} from '@/types/api';

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

export default api;
