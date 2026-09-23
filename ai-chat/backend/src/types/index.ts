export interface APIConfig {
  provider: 'openai' | 'google' | 'deepseek' | 'xfyun' | 'aliyun' | 'bytedance' | 'baidu' | 'tencent' | 'gptimage2' | 'custom';
  model: string;
  endpoint: string;
  apiKey: string;
  useProxy: boolean;
  proxyEndpoint: string;
}
