import axios, { AxiosInstance } from 'axios';
import type { APIConfig } from '@/types';

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'Network error';
    return Promise.reject(new Error(message));
  }
);

// Model Configs API
export const modelConfigsApi = {
  getAll: async () => {
    const response = await api.get('/character-chat/model-configs');
    return response.data;
  },

  getActive: async () => {
    const response = await api.get('/character-chat/model-configs/active');
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/character-chat/model-configs', data);
    return response.data.data;
  },

  update: async (id: number, data: any) => {
    await api.put(`/character-chat/model-configs/${id}`, data);
  },

  delete: async (id: number) => {
    await api.delete(`/character-chat/model-configs/${id}`);
  },

  activate: async (id: number) => {
    await api.post(`/character-chat/model-configs/${id}/activate`);
  },
};

// Character Chat API
export const characterChatApi = {
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

  sendMessage: async (conversationId: number, content: string, config: APIConfig, signal?: AbortSignal): Promise<Response> => {
    return fetch(`/api/character-chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, config }),
      signal,
    });
  },

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
