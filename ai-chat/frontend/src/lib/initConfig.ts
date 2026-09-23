import type { APIConfig } from '@/types';

const STORAGE_KEY_PREFIX = 'ai_chat_api_';

// 默认配置 - 用户需要替换为自己的 API Key
const DEFAULT_CONFIGS: Record<string, APIConfig> = {
  openai: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKey: 'sk-your-openai-key-here', // 用户需要替换
    endpoint: 'https://api.openai.com/v1',
    useProxy: false,
    proxyEndpoint: '',
  },
  deepseek: {
    provider: 'deepseek',
    model: 'deepseek-chat',
    apiKey: 'sk-your-deepseek-key-here', // 用户需要替换
    endpoint: 'https://api.deepseek.com',
    useProxy: false,
    proxyEndpoint: '',
  },
  anthropic: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    apiKey: 'sk-your-anthropic-key-here', // 用户需要替换
    endpoint: 'https://api.anthropic.com',
    useProxy: false,
    proxyEndpoint: '',
  },
  moonshot: {
    provider: 'moonshot',
    model: 'moonshot-v1-8k',
    apiKey: 'sk-your-moonshot-key-here', // 用户需要替换
    endpoint: 'https://api.moonshot.cn/v1',
    useProxy: false,
    proxyEndpoint: '',
  },
  qwen: {
    provider: 'qwen',
    model: 'qwen-max',
    apiKey: 'sk-your-qwen-key-here', // 用户需要替换
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    useProxy: false,
    proxyEndpoint: '',
  },
  hunyuan: {
    provider: 'hunyuan',
    model: 'hunyuan-lite',
    apiKey: 'sk-your-hunyuan-key-here', // 用户需要替换
    endpoint: 'https://api.hunyuan.cloud.tencent.com/v1',
    useProxy: false,
    proxyEndpoint: '',
  },
};

// 检查并初始化配置
export function initApiConfigs(): void {
  const hasAnyConfig = Object.keys(DEFAULT_CONFIGS).some(provider => {
    const key = `${STORAGE_KEY_PREFIX}${provider}`;
    return localStorage.getItem(key) !== null;
  });

  // 如果没有配置，设置默认配置（带占位符）
  if (!hasAnyConfig) {
    console.log('初始化默认 API 配置（请替换为有效的 API Key）');
    Object.entries(DEFAULT_CONFIGS).forEach(([provider, config]) => {
      const key = `${STORAGE_KEY_PREFIX}${provider}`;
      localStorage.setItem(key, JSON.stringify(config));
    });
    
    // 设置默认提供商
    localStorage.setItem('ai_chat_current_provider', 'deepseek');
  }

  // 检查当前配置是否有效
  const currentProvider = localStorage.getItem('ai_chat_current_provider') || 'deepseek';
  const currentKey = `${STORAGE_KEY_PREFIX}${currentProvider}`;
  const currentConfigStr = localStorage.getItem(currentKey);
  
  if (currentConfigStr) {
    try {
      const config = JSON.parse(currentConfigStr) as APIConfig;
      // 检查是否是占位符 key
      if (config.apiKey.includes('your-') || config.apiKey.includes('sk-your-')) {
        console.warn(`当前使用的 ${currentProvider} API Key 是占位符，请替换为有效的 Key`);
      }
    } catch {
      // 忽略解析错误
    }
  }
}

// 获取当前配置的 API Key（用于显示）
export function getCurrentApiKey(): string {
  const currentProvider = localStorage.getItem('ai_chat_current_provider') || 'deepseek';
  const key = `${STORAGE_KEY_PREFIX}${currentProvider}`;
  const value = localStorage.getItem(key);
  
  if (!value) return '';
  
  try {
    const config = JSON.parse(value) as APIConfig;
    return config.apiKey;
  } catch {
    return '';
  }
}

// 更新当前配置的 API Key
export function updateApiKey(provider: string, apiKey: string): void {
  const key = `${STORAGE_KEY_PREFIX}${provider}`;
  const value = localStorage.getItem(key);
  
  if (!value) {
    // 如果没有该提供商的配置，创建一个默认配置
    const defaultConfig = DEFAULT_CONFIGS[provider] || {
      provider: provider as any,
      model: 'gpt-4o-mini',
      apiKey,
      endpoint: 'https://api.openai.com/v1',
      useProxy: false,
      proxyEndpoint: '',
    };
    localStorage.setItem(key, JSON.stringify({ ...defaultConfig, apiKey }));
  } else {
    try {
      const config = JSON.parse(value) as APIConfig;
      config.apiKey = apiKey;
      localStorage.setItem(key, JSON.stringify(config));
    } catch {
      // 如果解析失败，创建新配置
      const newConfig: APIConfig = {
        provider: provider as any,
        model: 'gpt-4o-mini',
        apiKey,
        endpoint: 'https://api.openai.com/v1',
        useProxy: false,
        proxyEndpoint: '',
      };
      localStorage.setItem(key, JSON.stringify(newConfig));
    }
  }
  
  // 如果更新的是当前提供商，也更新当前提供商设置
  const currentProvider = localStorage.getItem('ai_chat_current_provider');
  if (currentProvider === provider) {
    localStorage.setItem('ai_chat_current_provider', provider);
  }
}