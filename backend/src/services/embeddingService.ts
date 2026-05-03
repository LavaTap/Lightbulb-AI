import OpenAI from 'openai';
import type { APIConfig } from '../types/index.js';
import { getAllModelConfigs } from '../database.js';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSION = 1536;

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

export async function generateEmbedding(
  text: string,
  config: APIConfig
): Promise<number[]> {
  const client = createOpenAIClient(config);

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSION,
  });

  return response.data[0].embedding;
}

export async function generateEmbeddings(
  texts: string[],
  config: APIConfig
): Promise<number[][]> {
  const client = createOpenAIClient(config);

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
    dimensions: EMBEDDING_DIMENSION,
  });

  return response.data.map(item => item.embedding);
}

export async function getEmbeddingConfig(): Promise<APIConfig | null> {
  try {
    const configs = await getAllModelConfigs();
    // 优先选择 OpenAI provider 且有 text 类别的配置
    const openaiTextConfig = configs.find(
      c => c.provider === 'openai' && c.category.includes('text') && c.api_key
    );
    if (openaiTextConfig) {
      return {
        provider: openaiTextConfig.provider as APIConfig['provider'],
        model: EMBEDDING_MODEL,
        endpoint: openaiTextConfig.endpoint || '',
        apiKey: openaiTextConfig.api_key!,
        useProxy: !!openaiTextConfig.use_proxy,
        proxyEndpoint: openaiTextConfig.proxy_endpoint || '',
      };
    }

    // 次选：任何有 text 类别的配置
    const anyTextConfig = configs.find(
      c => c.category.includes('text') && c.api_key
    );
    if (anyTextConfig) {
      return {
        provider: anyTextConfig.provider as APIConfig['provider'],
        model: EMBEDDING_MODEL,
        endpoint: anyTextConfig.endpoint || '',
        apiKey: anyTextConfig.api_key!,
        useProxy: !!anyTextConfig.use_proxy,
        proxyEndpoint: anyTextConfig.proxy_endpoint || '',
      };
    }

    // 降级：任何有 api_key 的活跃配置
    const activeConfig = configs.find(c => c.is_active && c.api_key);
    if (activeConfig) {
      return {
        provider: activeConfig.provider as APIConfig['provider'],
        model: EMBEDDING_MODEL,
        endpoint: activeConfig.endpoint || '',
        apiKey: activeConfig.api_key!,
        useProxy: !!activeConfig.use_proxy,
        proxyEndpoint: activeConfig.proxy_endpoint || '',
      };
    }

    return null;
  } catch (error) {
    console.warn('[EmbeddingService] Failed to get embedding config:', error);
    return null;
  }
}

export { EMBEDDING_DIMENSION };
