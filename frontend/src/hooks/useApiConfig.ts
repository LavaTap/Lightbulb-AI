import { useState, useCallback } from 'react';
import type { APIConfig } from '@/types';
import { 
  getStoredConfigs, 
  getConfig, 
  saveConfig, 
  getCurrentProvider, 
  setCurrentProvider 
} from '@/services/storage';

export function useApiConfig() {
  const [currentProvider, setProvider] = useState(getCurrentProvider());
  const [configs, setConfigs] = useState(getStoredConfigs());

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

  return {
    currentProvider,
    configs,
    getCurrentConfig,
    updateConfig,
    switchProvider,
  };
}
