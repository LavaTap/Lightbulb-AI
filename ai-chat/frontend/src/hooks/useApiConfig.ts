import { useState, useCallback, useEffect } from 'react';
import type { APIConfig, ModelConfig, ModelCategory } from '@/types';
import {
  getStoredConfigs,
  getConfig,
  saveConfig,
  getCurrentProvider,
  setCurrentProvider,
  getModelConfigs,
  getActiveModelConfig,
  saveModelConfig as saveModelConfigToBackend,
  activateModelConfig,
} from '@/services/storage';

export function useApiConfig() {
  const [currentProvider, setProvider] = useState(getCurrentProvider());
  const [configs, setConfigs] = useState(getStoredConfigs());
  const [modelConfigs, setModelConfigs] = useState<ModelConfig[]>([]);
  const [activeModelConfig, setActiveModelConfig] = useState<ModelConfig | null>(null);

  const loadModelConfigs = useCallback(async () => {
    try {
      const [allConfigs, activeConfig] = await Promise.all([getModelConfigs(), getActiveModelConfig()]);
      setModelConfigs(allConfigs);
      setActiveModelConfig(activeConfig);
    } catch (e) { console.error('Failed to load model configs:', e); }
  }, []);

  useEffect(() => { loadModelConfigs(); }, [loadModelConfigs]);

  const getCurrentConfig = useCallback((): APIConfig | null => getConfig(currentProvider), [currentProvider]);

  const updateConfig = useCallback((provider: string, config: APIConfig) => {
    saveConfig(provider, config);
    setConfigs(getStoredConfigs());
    setCurrentProvider(provider);
    setProvider(provider);
  }, []);

  const switchProvider = useCallback((provider: string) => {
    setCurrentProvider(provider);
    setProvider(provider);
  }, []);

  const saveToModelManager = useCallback(async (
    name: string, provider: string, model: string, apiKey: string, endpoint: string,
    useProxy: boolean, proxyEndpoint: string, category: ModelCategory | ModelCategory[],
    capabilities: string[], isActive: boolean = false
  ) => {
    try {
      const config = { name, provider: provider as any, model, apiKey, endpoint, useProxy, proxyEndpoint, category, capabilities, isActive };
      const id = await saveModelConfigToBackend(config);
      if (isActive) { await activateModelConfig(id); }
      const localConfig: APIConfig = { provider: provider as APIConfig['provider'], model, apiKey, endpoint, useProxy, proxyEndpoint };
      saveConfig(provider, localConfig);
      setConfigs(getStoredConfigs());
      setCurrentProvider(provider);
      setProvider(provider);
      await loadModelConfigs();
      return id;
    } catch (e) { console.error('Failed to save to model manager:', e); throw e; }
  }, [loadModelConfigs]);

  const getConfigsByCategory = useCallback((category: ModelCategory | ModelCategory[]) => {
    const targetCategories = Array.isArray(category) ? category : [category];
    return modelConfigs.filter(c => {
      const configCategories = Array.isArray(c.category) ? c.category : [c.category];
      return configCategories.some(cat => targetCategories.includes(cat));
    });
  }, [modelConfigs]);

  const deleteModelConfig = useCallback(async (id: number) => {
    const { modelConfigsApi } = await import('@/services/api');
    await modelConfigsApi.delete(id);
    await loadModelConfigs();
  }, [loadModelConfigs]);

  const updateModelConfigById = useCallback(async (id: number, data: any) => {
    const { modelConfigsApi } = await import('@/services/api');
    await modelConfigsApi.update(id, data);
    await loadModelConfigs();
  }, [loadModelConfigs]);

  const testConnection = useCallback(async (config: any) => {
    const { modelConfigsApi } = await import('@/services/api');
    return await modelConfigsApi.create(config);
  }, []);

  return {
    currentProvider, configs, modelConfigs, activeModelConfig,
    getCurrentConfig, updateConfig, switchProvider, saveToModelManager,
    getConfigsByCategory, deleteModelConfig, updateModelConfig: updateModelConfigById,
    reloadModelConfigs: loadModelConfigs, testConnection,
  };
}
