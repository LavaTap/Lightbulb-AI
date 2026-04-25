import type { APIConfig } from '@/types';

const STORAGE_KEY_PREFIX = 'charaforge_api_';

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

export function getCurrentProvider(): string {
  return localStorage.getItem('lightbulb_current_provider') || 'openai';
}

export function setCurrentProvider(provider: string): void {
  localStorage.setItem('lightbulb_current_provider', provider);
}
