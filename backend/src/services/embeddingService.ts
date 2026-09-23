import OpenAI from 'openai';
import type { APIConfig } from '../types/index.js';
import { getAllModelConfigs } from '../database.js';

// 各 provider 的嵌入模型和维度
const PROVIDER_EMBEDDING: Record<string, { model: string; dimension: number; endpoint: string }> = {
  openai: { model: 'text-embedding-3-small', dimension: 1536, endpoint: '' },
  aliyun: { model: 'text-embedding-v3', dimension: 1024, endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  google: { model: 'text-embedding-004', dimension: 768, endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai' },
  bytedance: { model: 'doubao-embedding-large-250515', dimension: 1024, endpoint: 'https://ark.cn-beijing.volces.com/api/v3' },
  baidu: { model: 'embedding-v1', dimension: 384, endpoint: 'https://qianfan.baidubce.com/v2' },
};

// 默认维度（OpenAI）
const DEFAULT_DIMENSION = 1536;

let cachedEmbeddingConfig: { config: APIConfig; model: string; dimension: number } | null = null;

function createOpenAIClient(config: APIConfig): OpenAI {
  const baseURL = config.useProxy && config.proxyEndpoint
    ? config.proxyEndpoint
    : config.endpoint || undefined;

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL,
    dangerouslyAllowBrowser: true,
  });
}

export function getEmbeddingDimension(): number {
  return cachedEmbeddingConfig?.dimension || DEFAULT_DIMENSION;
}

export async function generateEmbedding(
  text: string,
  config?: APIConfig
): Promise<number[]> {
  const embeddingConfig = config
    ? { config, model: getEmbeddingModelForProvider(config.provider), dimension: getDimensionForProvider(config.provider) }
    : cachedEmbeddingConfig || await resolveEmbeddingConfig();

  if (!embeddingConfig) {
    throw new Error('No embedding config available');
  }

  const client = createOpenAIClient(embeddingConfig.config);

  const response = await client.embeddings.create({
    model: embeddingConfig.model,
    input: text,
    dimensions: embeddingConfig.dimension,
  });

  return response.data[0].embedding;
}

export async function generateEmbeddings(
  texts: string[],
  config?: APIConfig
): Promise<number[][]> {
  const embeddingConfig = config
    ? { config, model: getEmbeddingModelForProvider(config.provider), dimension: getDimensionForProvider(config.provider) }
    : cachedEmbeddingConfig || await resolveEmbeddingConfig();

  if (!embeddingConfig) {
    throw new Error('No embedding config available');
  }

  const client = createOpenAIClient(embeddingConfig.config);

  const response = await client.embeddings.create({
    model: embeddingConfig.model,
    input: texts,
    dimensions: embeddingConfig.dimension,
  });

  return response.data.map(item => item.embedding);
}

function getEmbeddingModelForProvider(provider: string): string {
  return PROVIDER_EMBEDDING[provider]?.model || 'text-embedding-3-small';
}

function getDimensionForProvider(provider: string): number {
  return PROVIDER_EMBEDDING[provider]?.dimension || DEFAULT_DIMENSION;
}

export async function getEmbeddingConfig(): Promise<APIConfig | null> {
  const resolved = await resolveEmbeddingConfig();
  return resolved?.config || null;
}

async function resolveEmbeddingConfig(): Promise<{ config: APIConfig; model: string; dimension: number } | null> {
  if (cachedEmbeddingConfig) return cachedEmbeddingConfig;

  try {
    const configs = await getAllModelConfigs();

    // 按 provider 优先级查找支持嵌入的配置
    const providerPriority = ['openai', 'aliyun', 'google', 'bytedance', 'baidu'];

    for (const provider of providerPriority) {
      if (!PROVIDER_EMBEDDING[provider]) continue;
      const providerEndpoint = PROVIDER_EMBEDDING[provider].endpoint;
      const match = configs.find(
        c => (c.provider === provider || (c.provider === 'custom' && providerEndpoint && c.endpoint?.includes(providerEndpoint))) && c.api_key
      );
      if (match) {
        const embeddingInfo = PROVIDER_EMBEDDING[provider];
        cachedEmbeddingConfig = {
          config: {
            provider: provider as APIConfig['provider'],
            model: embeddingInfo.model,
            endpoint: match.endpoint || embeddingInfo.endpoint,
            apiKey: match.api_key!,
            useProxy: !!match.use_proxy,
            proxyEndpoint: match.proxy_endpoint || '',
          },
          model: embeddingInfo.model,
          dimension: embeddingInfo.dimension,
        };
        console.log(`[EmbeddingService] Using ${provider} embedding: ${embeddingInfo.model} (${embeddingInfo.dimension}d)`);
        return cachedEmbeddingConfig;
      }
    }

    // 降级：任何有 api_key 且 provider 在支持列表中的配置，或 custom 配置 endpoint 匹配
    const anySupported = configs.find(c => {
      if (!c.api_key) return false;
      if (PROVIDER_EMBEDDING[c.provider]) return true;
      if (c.provider === 'custom') {
        return Object.values(PROVIDER_EMBEDDING).some(pe => pe.endpoint && c.endpoint?.includes(pe.endpoint));
      }
      return false;
    });
    if (anySupported) {
      // For custom providers, find the matching embedding info by endpoint
      let embeddingInfo = PROVIDER_EMBEDDING[anySupported.provider];
      let resolvedProvider = anySupported.provider;
      if (!embeddingInfo && anySupported.provider === 'custom') {
        for (const [provider, info] of Object.entries(PROVIDER_EMBEDDING)) {
          if (info.endpoint && anySupported.endpoint?.includes(info.endpoint)) {
            embeddingInfo = info;
            resolvedProvider = provider;
            break;
          }
        }
      }
      if (!embeddingInfo) return null;

      cachedEmbeddingConfig = {
        config: {
          provider: resolvedProvider as APIConfig['provider'],
          model: embeddingInfo.model,
          endpoint: anySupported.endpoint || embeddingInfo.endpoint,
          apiKey: anySupported.api_key!,
          useProxy: !!anySupported.use_proxy,
          proxyEndpoint: anySupported.proxy_endpoint || '',
        },
        model: embeddingInfo.model,
        dimension: embeddingInfo.dimension,
      };
      console.log(`[EmbeddingService] Using fallback ${anySupported.provider} embedding: ${embeddingInfo.model}`);
      return cachedEmbeddingConfig;
    }

    console.warn('[EmbeddingService] No supported embedding provider found');
    return null;
  } catch (error) {
    console.warn('[EmbeddingService] Failed to resolve embedding config:', error);
    return null;
  }
}

export { DEFAULT_DIMENSION as EMBEDDING_DIMENSION };
