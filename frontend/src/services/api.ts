import axios, { AxiosInstance } from 'axios';
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  GenerateImageRequest,
  GenerateImageResponse,
  GeneratePosterRequest,
  GeneratePosterResponse,
  RecordsResponse,
  CreateRecordRequest
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

export default api;
