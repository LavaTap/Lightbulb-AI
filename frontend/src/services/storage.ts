import type { APIConfig, ModelConfig, ModelCategory } from '@/types';
import { modelConfigsApi } from './api';

const STORAGE_KEY_PREFIX = 'charaforge_api_';

// Legacy localStorage functions for backward compatibility
export function getStoredConfigs(): Record<string, APIConfig> {
  const configs: Record<string, APIConfig> = {};
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_KEY_PREFIX)) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          const config = JSON.parse(value);
          const provider = key.replace(STORAGE_KEY_PREFIX, '');
          configs[provider] = config;
        }
      } catch (e) {
        console.error('Failed to parse config:', e);
      }
    }
  }
  
  return configs;
}

export function getConfig(provider: string): APIConfig | null {
  const key = `${STORAGE_KEY_PREFIX}${provider}`;
  const value = localStorage.getItem(key);
  if (!value) return null;
  
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function saveConfig(provider: string, config: APIConfig): void {
  const key = `${STORAGE_KEY_PREFIX}${provider}`;
  localStorage.setItem(key, JSON.stringify(config));
}

export function deleteConfig(provider: string): void {
  const key = `${STORAGE_KEY_PREFIX}${provider}`;
  localStorage.removeItem(key);
}

// Model Configs from Backend Database
export async function getModelConfigs(): Promise<ModelConfig[]> {
  try {
    const response = await modelConfigsApi.getAll();
    return response.data;
  } catch (e) {
    console.error('Failed to fetch model configs from API:', e);
    return [];
  }
}

export async function getActiveModelConfig(): Promise<ModelConfig | null> {
  try {
    const response = await modelConfigsApi.getActive();
    return response.data;
  } catch (e) {
    console.error('Failed to fetch active model config:', e);
    return null;
  }
}

export async function saveModelConfig(config: Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  const result = await modelConfigsApi.create(config as any);
  return result.id;
}

export async function updateModelConfig(id: number, config: Partial<ModelConfig>): Promise<void> {
  await modelConfigsApi.update(id, config as any);
}

export async function deleteModelConfig(id: number): Promise<void> {
  await modelConfigsApi.delete(id);
}

export async function activateModelConfig(id: number): Promise<void> {
  await modelConfigsApi.activate(id);
}

// Get configs filtered by category
export async function getModelConfigsByCategory(category: ModelCategory): Promise<ModelConfig[]> {
  const configs = await getModelConfigs();
  return configs.filter(c => c.category === category);
}

// Theme functions
export function getTheme(): 'dark' | 'light' {
  const stored = localStorage.getItem('lightbulb_theme');
  if (stored === 'light' || stored === 'dark') return stored;
  
  // Check system preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function setTheme(theme: 'dark' | 'light'): void {
  localStorage.setItem('lightbulb_theme', theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

// Provider functions
export function getCurrentProvider(): string {
  return localStorage.getItem('lightbulb_current_provider') || 'openai';
}

export function setCurrentProvider(provider: string): void {
  localStorage.setItem('lightbulb_current_provider', provider);
}
