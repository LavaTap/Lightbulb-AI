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
  saveModelConfig,
  activateModelConfig,
} from '@/services/storage';
import { modelConfigsApi } from '@/services/api';

export function useApiConfig() {
  const [currentProvider, setProvider] = useState(getCurrentProvider());
  const [configs, setConfigs] = useState(getStoredConfigs());
  const [modelConfigs, setModelConfigs] = useState<ModelConfig[]>([]);
  const [activeModelConfig, setActiveModelConfig] = useState<ModelConfig | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ModelCategory>('vision');

  // Load model configs from backend
  const loadModelConfigs = useCallback(async () => {
    try {
      const [allConfigs, activeConfig] = await Promise.all([
        getModelConfigs(),
        getActiveModelConfig(),
      ]);
      setModelConfigs(allConfigs);
      setActiveModelConfig(activeConfig);
    } catch (e) {
      console.error('Failed to load model configs:', e);
    }
  }, []);

  useEffect(() => {
    loadModelConfigs();
  }, [loadModelConfigs]);

  const getCurrentConfig = useCallback((): APIConfig | null => {
    return getConfig(currentProvider);
  }, [currentProvider]);

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

  // Save config to both localStorage and backend database
  const saveToModelManager = useCallback(async (
    name: string,
    provider: string,
    model: string,
    apiKey: string,
    endpoint: string,
    useProxy: boolean,
    proxyEndpoint: string,
    category: ModelCategory,
    capabilities: string[],
    isActive: boolean = false
  ) => {
    try {
      const config = {
        name,
        provider: provider as any,
        model,
        apiKey,
        endpoint,
        useProxy,
        proxyEndpoint,
        category,
        capabilities,
        isActive,
      };

      // Save to backend database
      const id = await saveModelConfig(config);
      
      // If set as active, activate it
      if (isActive) {
        await activateModelConfig(id);
      }

      // Also save to localStorage for backward compatibility
      const localConfig: APIConfig = {
        provider: provider as APIConfig['provider'],
        model,
        apiKey,
        endpoint,
        useProxy,
        proxyEndpoint,
      };
      saveConfig(provider, localConfig);
      setConfigs(getStoredConfigs());
      setCurrentProvider(provider);
      setProvider(provider);

      // Reload configs
      await loadModelConfigs();

      return id;
    } catch (e) {
      console.error('Failed to save to model manager:', e);
      throw e;
    }
  }, [loadModelConfigs]);

  // Get configs filtered by category
  const getConfigsByCategory = useCallback((category: ModelCategory) => {
    return modelConfigs.filter(c => c.category === category);
  }, [modelConfigs]);

  // Set selected category
  const selectCategory = useCallback((category: ModelCategory) => {
    setSelectedCategory(category);
  }, []);

  // Test connection
  const testConnection = useCallback(async (config: {
    provider: string;
    apiKey: string;
    model: string;
    endpoint?: string;
    useProxy?: boolean;
    proxyEndpoint?: string;
  }) => {
    const response = await modelConfigsApi.testConnection(config);
    return response;
  }, []);

  // Detect model capabilities (vision, text-to-image, image-to-image)
  const detectCapabilities = useCallback(async (config: {
    provider: string;
    apiKey: string;
    model: string;
    endpoint?: string;
    useProxy?: boolean;
    proxyEndpoint?: string;
  }) => {
    const response = await modelConfigsApi.detectCapabilities(config);
    return response;
  }, []);

  // Delete model config
  const deleteModelConfigById = useCallback(async (id: number) => {
    await modelConfigsApi.delete(id);
    await loadModelConfigs();
  }, [loadModelConfigs]);

  // Update model config by ID
  const updateModelConfigById = useCallback(async (
    id: number,
    data: {
      name?: string;
      provider?: string;
      model?: string;
      category?: string;
    }
  ) => {
    await modelConfigsApi.update(id, data);
    await loadModelConfigs();
  }, [loadModelConfigs]);

  return {
    currentProvider,
    configs,
    modelConfigs,
    activeModelConfig,
    selectedCategory,
    getCurrentConfig,
    updateConfig,
    switchProvider,
    saveToModelManager,
    getConfigsByCategory,
    selectCategory,
    testConnection,
    detectCapabilities,
    deleteModelConfig: deleteModelConfigById,
    updateModelConfig: updateModelConfigById,
    reloadModelConfigs: loadModelConfigs,
  };
}
