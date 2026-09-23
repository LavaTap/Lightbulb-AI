import type { APIConfig, ModelConfig, ModelCategory } from '@/types';
import { modelConfigsApi } from './api';

const STORAGE_KEY_PREFIX = 'ai_chat_api_';

export function getStoredConfigs(): Record<string, APIConfig> {
  const configs: Record<string, APIConfig> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_KEY_PREFIX)) {
      try {
        const value = localStorage.getItem(key);
        if (value) { const config = JSON.parse(value); const provider = key.replace(STORAGE_KEY_PREFIX, ''); configs[provider] = config; }
      } catch (e) { console.error('Failed to parse config:', e); }
    }
  }
  return configs;
}

export function getConfig(provider: string): APIConfig | null {
  const key = `${STORAGE_KEY_PREFIX}${provider}`;
  const value = localStorage.getItem(key);
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}

export function saveConfig(provider: string, config: APIConfig): void {
  const key = `${STORAGE_KEY_PREFIX}${provider}`;
  localStorage.setItem(key, JSON.stringify(config));
}

export function getCurrentProvider(): string {
  return localStorage.getItem('ai_chat_current_provider') || 'openai';
}

export function setCurrentProvider(provider: string): void {
  localStorage.setItem('ai_chat_current_provider', provider);
}

export async function getModelConfigs(): Promise<ModelConfig[]> {
  try {
    const response = await modelConfigsApi.getAll();
    return response.data;
  } catch (e) { console.error('Failed to fetch model configs:', e); return []; }
}

export async function getActiveModelConfig(): Promise<ModelConfig | null> {
  try {
    const response = await modelConfigsApi.getActive();
    return response.data;
  } catch (e) { console.error('Failed to fetch active model config:', e); return null; }
}

export async function saveModelConfig(config: Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  const result = await modelConfigsApi.create(config as any);
  return result.id;
}

export async function activateModelConfig(id: number): Promise<void> {
  await modelConfigsApi.activate(id);
}

export function getTheme(): 'dark' | 'light' {
  const stored = localStorage.getItem('ai_chat_theme');
  if (stored === 'light' || stored === 'dark') return stored;
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

export function setTheme(theme: 'dark' | 'light'): void {
  localStorage.setItem('ai_chat_theme', theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
}
