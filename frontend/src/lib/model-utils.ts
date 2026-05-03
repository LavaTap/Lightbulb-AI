import type { APIConfig, ModelConfig } from '@/types';

export function modelConfigToApiConfig(config: ModelConfig): APIConfig {
  return {
    provider: config.provider as APIConfig['provider'],
    model: config.model,
    endpoint: config.endpoint || '',
    apiKey: config.apiKey || '',
    useProxy: config.useProxy,
    proxyEndpoint: config.proxyEndpoint || '',
  };
}

const MODEL_ID_PREFIX = 'lightbulb_model_id_';

export function getPersistedModelId(feature: string): string | null {
  return localStorage.getItem(`${MODEL_ID_PREFIX}${feature}`);
}

export function setPersistedModelId(feature: string, id: string): void {
  localStorage.setItem(`${MODEL_ID_PREFIX}${feature}`, id);
}
